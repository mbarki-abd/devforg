import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import pino from 'pino';
import type { UnixAccount } from '../types/index.js';

const exec = promisify(execCallback);
const logger = pino({ name: 'unix-manager' });

export class UnixManager {
  private minUid = 10000;
  private maxUid = 60000;

  async createAccount(username: string): Promise<UnixAccount> {
    // Validate username format
    if (!/^[a-z][a-z0-9_]{2,31}$/.test(username)) {
      throw new Error('Invalid username format. Must start with lowercase letter, 3-32 chars, only lowercase, numbers, underscores.');
    }

    // Check if user already exists
    try {
      await exec(`id ${username}`);
      throw new Error(`User ${username} already exists`);
    } catch (error) {
      // User doesn't exist, which is what we want
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
    }

    // Get next available UID
    const uid = await this.getNextUid();
    const gid = uid; // Use same value for GID

    logger.info({ username, uid }, 'Creating Unix account');

    try {
      // Create group
      await exec(`groupadd -g ${gid} ${username}`);
      logger.info({ username, gid }, 'Group created');

      // Create user
      await exec(`useradd -u ${uid} -g ${gid} -m -s /bin/bash ${username}`);
      logger.info({ username, uid }, 'User created');

      // Setup home directory with proper permissions
      const homeDir = `/home/${username}`;
      await this.setupHomeDirectory(homeDir, username, uid, gid);

      return {
        username,
        uid,
        gid,
        homeDirectory: homeDir,
        shell: '/bin/bash',
      };
    } catch (error) {
      logger.error({ error, username }, 'Failed to create Unix account');
      // Cleanup on failure
      try {
        await exec(`userdel -r ${username} 2>/dev/null || true`);
        await exec(`groupdel ${username} 2>/dev/null || true`);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private async getNextUid(): Promise<number> {
    try {
      // Get all existing UIDs in our range
      const { stdout } = await exec(`awk -F: '$3 >= ${this.minUid} && $3 <= ${this.maxUid} { print $3 }' /etc/passwd | sort -n`);
      const existingUids = stdout.trim().split('\n').filter(Boolean).map(Number);

      // Find first available UID
      for (let uid = this.minUid; uid <= this.maxUid; uid++) {
        if (!existingUids.includes(uid)) {
          return uid;
        }
      }

      throw new Error('No available UIDs in range');
    } catch (error) {
      logger.error({ error }, 'Failed to get next UID');
      throw error;
    }
  }

  private async setupHomeDirectory(homeDir: string, username: string, uid: number, gid: number): Promise<void> {
    // Create standard directories
    const dirs = ['.ssh', '.config', 'projects', 'tmp'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(homeDir, dir), { recursive: true });
    }

    // Create .bashrc
    const bashrc = `
# DevForge user environment
export PATH="$HOME/.local/bin:$PATH"
export EDITOR=vim
export TERM=xterm-256color

# Aliases
alias ll='ls -la'
alias projects='cd ~/projects'

# Prompt
PS1='\\[\\033[01;32m\\]\\u@devforge\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '
`;
    await fs.writeFile(path.join(homeDir, '.bashrc'), bashrc);

    // Create .profile
    const profile = `
if [ -n "$BASH_VERSION" ]; then
    if [ -f "$HOME/.bashrc" ]; then
        . "$HOME/.bashrc"
    fi
fi
`;
    await fs.writeFile(path.join(homeDir, '.profile'), profile);

    // Set proper ownership
    await exec(`chown -R ${uid}:${gid} ${homeDir}`);
    await exec(`chmod 700 ${homeDir}`);
    await exec(`chmod 700 ${homeDir}/.ssh`);

    logger.info({ homeDir, username }, 'Home directory setup complete');
  }

  async grantSudo(username: string, commands?: string[]): Promise<void> {
    logger.info({ username, commands }, 'Granting sudo access');

    const sudoersFile = `/etc/sudoers.d/${username}`;

    if (commands && commands.length > 0) {
      // Limited sudo for specific commands only
      const cmdList = commands.map(cmd => cmd.replace(/'/g, "'\"'\"'")).join(', ');
      const content = `${username} ALL=(ALL) NOPASSWD: ${cmdList}\n`;
      await fs.writeFile(sudoersFile, content, { mode: 0o440 });
    } else {
      // Full sudo access
      const content = `${username} ALL=(ALL) NOPASSWD: ALL\n`;
      await fs.writeFile(sudoersFile, content, { mode: 0o440 });
    }

    // Validate sudoers file
    try {
      await exec(`visudo -c -f ${sudoersFile}`);
    } catch (error) {
      // Remove invalid file
      await fs.unlink(sudoersFile);
      throw new Error('Invalid sudoers configuration');
    }

    logger.info({ username }, 'Sudo access granted');
  }

  async revokeSudo(username: string): Promise<void> {
    logger.info({ username }, 'Revoking sudo access');

    const sudoersFile = `/etc/sudoers.d/${username}`;

    try {
      await fs.unlink(sudoersFile);
    } catch (error) {
      // File might not exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Also remove from sudo group if present
    try {
      await exec(`gpasswd -d ${username} sudo 2>/dev/null || true`);
    } catch {
      // Ignore
    }

    logger.info({ username }, 'Sudo access revoked');
  }

  async deleteAccount(username: string): Promise<void> {
    logger.info({ username }, 'Deleting Unix account');

    // Check if user exists
    try {
      await exec(`id ${username}`);
    } catch {
      throw new Error(`User ${username} does not exist`);
    }

    // Kill all user processes first
    try {
      await exec(`pkill -u ${username} 2>/dev/null || true`);
    } catch {
      // Ignore
    }

    // Remove sudoers file if exists
    try {
      await fs.unlink(`/etc/sudoers.d/${username}`);
    } catch {
      // Ignore
    }

    // Delete user and home directory
    await exec(`userdel -r ${username}`);

    // Delete group
    try {
      await exec(`groupdel ${username}`);
    } catch {
      // Group might not exist or might be primary group
    }

    logger.info({ username }, 'Unix account deleted');
  }

  async executeAs(username: string, command: string, workDir?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const cdCmd = workDir ? `cd ${workDir} && ` : '';
    const fullCommand = `sudo -u ${username} -H bash -c '${cdCmd}${command.replace(/'/g, "'\"'\"'")}'`;

    try {
      const { stdout, stderr } = await exec(fullCommand, { timeout: 300000 }); // 5 min timeout
      return { stdout, stderr, exitCode: 0 };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: execError.stdout || '',
        stderr: execError.stderr || (error instanceof Error ? error.message : 'Unknown error'),
        exitCode: execError.code || 1,
      };
    }
  }
}
