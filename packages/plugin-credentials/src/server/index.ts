import { Plugin } from '@nocobase/server';
import path from 'path';
import crypto from 'crypto';

// Simple encryption for credential storage (in production, use proper KMS)
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export class PluginCredentials extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // Load collections
    await this.db.import({
      directory: path.resolve(__dirname, 'collections'),
    });

    // Register credential management actions
    this.app.resourcer.define({
      name: 'credentials',
      actions: {
        // Store a credential (encrypts before saving)
        store: async (ctx, next) => {
          const { name, type, value, projectId } = ctx.action.params.values || {};

          if (!name || !type || !value) {
            ctx.throw(400, 'Name, type, and value are required');
          }

          // Encrypt the credential value
          const encryptedValue = encrypt(JSON.stringify(value));

          const credential = await this.db.getRepository('credentials').create({
            values: {
              name,
              type,
              encryptedValue,
              projectId,
              createdById: ctx.state.currentUser?.id,
            },
          });

          ctx.body = {
            success: true,
            id: credential.id,
            name: credential.name,
            type: credential.type,
            // Don't return the encrypted value
          };

          await next();
        },

        // Retrieve a credential (decrypts before returning)
        retrieve: async (ctx, next) => {
          const { filterByTk: credentialId } = ctx.action.params;

          const credential = await this.db.getRepository('credentials').findOne({
            filter: { id: credentialId },
          });

          if (!credential) {
            ctx.throw(404, 'Credential not found');
          }

          // Check if user has access
          const hasAccess = await this.checkCredentialAccess(
            credential,
            ctx.state.currentUser?.id
          );

          if (!hasAccess) {
            ctx.throw(403, 'Access denied');
          }

          // Decrypt the credential
          const decryptedValue = JSON.parse(decrypt(credential.encryptedValue));

          ctx.body = {
            id: credential.id,
            name: credential.name,
            type: credential.type,
            value: decryptedValue,
          };

          await next();
        },

        // List credentials (without values)
        list: async (ctx, next) => {
          const { projectId } = ctx.action.params;

          const filter: Record<string, unknown> = {};
          if (projectId) {
            filter.projectId = projectId;
          }

          const credentials = await this.db.getRepository('credentials').find({
            filter,
            fields: ['id', 'name', 'type', 'projectId', 'createdAt', 'updatedAt'],
          });

          ctx.body = credentials;
          await next();
        },

        // Rotate a credential
        rotate: async (ctx, next) => {
          const { filterByTk: credentialId } = ctx.action.params;
          const { newValue } = ctx.action.params.values || {};

          const credential = await this.db.getRepository('credentials').findOne({
            filter: { id: credentialId },
          });

          if (!credential) {
            ctx.throw(404, 'Credential not found');
          }

          // Encrypt the new value
          const encryptedValue = encrypt(JSON.stringify(newValue));

          await this.db.getRepository('credentials').update({
            filter: { id: credentialId },
            values: {
              encryptedValue,
              rotatedAt: new Date(),
            },
          });

          // Update credential in Agent API Redis cache
          const agentGateway = this.app.container.get('agentGateway') as any;
          if (agentGateway && agentGateway.updateCredential) {
            await agentGateway.updateCredential(credentialId, newValue);
          }

          ctx.body = {
            success: true,
            message: 'Credential rotated successfully',
          };

          await next();
        },

        // Delete a credential
        delete: async (ctx, next) => {
          const { filterByTk: credentialId } = ctx.action.params;

          await this.db.getRepository('credentials').destroy({
            filter: { id: credentialId },
          });

          ctx.body = {
            success: true,
            message: 'Credential deleted',
          };

          await next();
        },
      },
    });

    // Register provider-specific actions
    this.app.resourcer.define({
      name: 'credential-providers',
      actions: {
        // List available credential providers
        list: async (ctx, next) => {
          ctx.body = [
            {
              type: 'api_key',
              name: 'API Key',
              description: 'Simple API key authentication',
              fields: ['key'],
            },
            {
              type: 'oauth2',
              name: 'OAuth 2.0',
              description: 'OAuth 2.0 authentication',
              fields: ['clientId', 'clientSecret', 'refreshToken', 'accessToken'],
            },
            {
              type: 'ssh',
              name: 'SSH Key',
              description: 'SSH key pair for server access',
              fields: ['privateKey', 'publicKey', 'passphrase'],
            },
            {
              type: 'azure',
              name: 'Azure Service Principal',
              description: 'Azure Service Principal credentials',
              fields: ['tenantId', 'clientId', 'clientSecret', 'subscriptionId'],
            },
            {
              type: 'gcloud',
              name: 'Google Cloud Service Account',
              description: 'GCP service account key',
              fields: ['serviceAccountJson'],
            },
            {
              type: 'docker',
              name: 'Docker Registry',
              description: 'Docker registry credentials',
              fields: ['registry', 'username', 'password'],
            },
            {
              type: 'database',
              name: 'Database Connection',
              description: 'Database connection credentials',
              fields: ['host', 'port', 'database', 'username', 'password'],
            },
          ];

          await next();
        },
      },
    });

    // Register ACL resources
    this.app.acl.registerSnippet({
      name: `pm.${this.name}`,
      actions: ['credentials:*', 'credential-providers:*'],
    });

    this.app.logger.info('Credentials plugin loaded');
  }

  private async checkCredentialAccess(credential: any, userId: string): Promise<boolean> {
    // Owner always has access
    if (credential.createdById === userId) {
      return true;
    }

    // Check project membership if credential is project-scoped
    if (credential.projectId) {
      const membership = await this.db.getRepository('project_members').findOne({
        filter: {
          projectId: credential.projectId,
          userId,
        },
      });

      return !!membership;
    }

    return false;
  }

  async install() {
    await this.db.sync();
    this.app.logger.info('Credentials plugin installed');
  }

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginCredentials;
