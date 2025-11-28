#!/bin/bash

# DevForge NocoBase Setup Script
# Creates collections and menu items for DevForge in NocoBase

API_URL="https://devforge.ilinqsoft.com/api"

# Login and get token
echo "Authenticating..."
RESPONSE=$(curl -s "${API_URL}/auth:signIn" \
  -H "Content-Type: application/json" \
  -d '{"account":"admin@nocobase.com","password":"admin123"}')

TOKEN=$(echo $RESPONSE | jq -r ".data.token")
echo "Got token: ${TOKEN:0:30}..."

# Create Projects Collection
echo "Creating Projects collection..."
curl -s "${API_URL}/collections:create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "projects",
    "title": "Projects",
    "autoGenId": true,
    "createdBy": true,
    "updatedBy": true,
    "sortable": true,
    "fields": [
      {"name": "name", "type": "string", "interface": "input", "uiSchema": {"title": "Project Name", "type": "string", "x-component": "Input"}},
      {"name": "slug", "type": "string", "interface": "input", "uiSchema": {"title": "Slug", "type": "string", "x-component": "Input"}},
      {"name": "description", "type": "text", "interface": "textarea", "uiSchema": {"title": "Description", "type": "string", "x-component": "Input.TextArea"}},
      {"name": "repositoryUrl", "type": "string", "interface": "input", "uiSchema": {"title": "Repository URL", "type": "string", "x-component": "Input"}},
      {"name": "branch", "type": "string", "interface": "input", "defaultValue": "main", "uiSchema": {"title": "Branch", "type": "string", "x-component": "Input"}},
      {"name": "status", "type": "string", "interface": "select", "defaultValue": "active", "uiSchema": {"title": "Status", "type": "string", "x-component": "Select", "enum": [{"value": "active", "label": "Active"}, {"value": "archived", "label": "Archived"}, {"value": "pending", "label": "Pending"}]}}
    ]
  }' | jq '.data.name // .errors'

# Create Agents Collection
echo "Creating Agents collection..."
curl -s "${API_URL}/collections:create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "agents",
    "title": "Agents",
    "autoGenId": true,
    "createdBy": true,
    "updatedBy": true,
    "sortable": true,
    "fields": [
      {"name": "name", "type": "string", "interface": "input", "uiSchema": {"title": "Agent Name", "type": "string", "x-component": "Input"}},
      {"name": "type", "type": "string", "interface": "select", "uiSchema": {"title": "Agent Type", "type": "string", "x-component": "Select", "enum": [{"value": "claude", "label": "Claude AI"}, {"value": "shell", "label": "Shell Executor"}, {"value": "docker", "label": "Docker Agent"}, {"value": "kubernetes", "label": "Kubernetes Agent"}, {"value": "azure", "label": "Azure Agent"}, {"value": "gcloud", "label": "Google Cloud Agent"}, {"value": "git", "label": "Git Agent"}, {"value": "npm", "label": "NPM Agent"}]}},
      {"name": "status", "type": "string", "interface": "select", "defaultValue": "offline", "uiSchema": {"title": "Status", "type": "string", "x-component": "Select", "enum": [{"value": "online", "label": "Online"}, {"value": "offline", "label": "Offline"}, {"value": "busy", "label": "Busy"}, {"value": "error", "label": "Error"}]}},
      {"name": "endpoint", "type": "string", "interface": "input", "uiSchema": {"title": "Endpoint URL", "type": "string", "x-component": "Input"}},
      {"name": "lastHealthCheck", "type": "date", "interface": "datetime", "uiSchema": {"title": "Last Health Check", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": true}}}
    ]
  }' | jq '.data.name // .errors'

# Create Workflows Collection
echo "Creating Workflows collection..."
curl -s "${API_URL}/collections:create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "devforge_workflows",
    "title": "DevForge Workflows",
    "autoGenId": true,
    "createdBy": true,
    "updatedBy": true,
    "sortable": true,
    "fields": [
      {"name": "name", "type": "string", "interface": "input", "uiSchema": {"title": "Workflow Name", "type": "string", "x-component": "Input"}},
      {"name": "description", "type": "text", "interface": "textarea", "uiSchema": {"title": "Description", "type": "string", "x-component": "Input.TextArea"}},
      {"name": "trigger", "type": "string", "interface": "select", "defaultValue": "manual", "uiSchema": {"title": "Trigger Type", "type": "string", "x-component": "Select", "enum": [{"value": "manual", "label": "Manual"}, {"value": "schedule", "label": "Scheduled"}, {"value": "webhook", "label": "Webhook"}, {"value": "event", "label": "Event"}]}},
      {"name": "triggerConfig", "type": "json", "interface": "json", "defaultValue": {}, "uiSchema": {"title": "Trigger Config", "type": "object", "x-component": "Input.JSON"}},
      {"name": "steps", "type": "json", "interface": "json", "defaultValue": [], "uiSchema": {"title": "Steps", "type": "array", "x-component": "Input.JSON"}},
      {"name": "enabled", "type": "boolean", "interface": "checkbox", "defaultValue": true, "uiSchema": {"title": "Enabled", "type": "boolean", "x-component": "Checkbox"}}
    ]
  }' | jq '.data.name // .errors'

# Create Credentials Collection
echo "Creating Credentials collection..."
curl -s "${API_URL}/collections:create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "credentials",
    "title": "Credentials",
    "autoGenId": true,
    "createdBy": true,
    "updatedBy": true,
    "sortable": true,
    "fields": [
      {"name": "name", "type": "string", "interface": "input", "uiSchema": {"title": "Credential Name", "type": "string", "x-component": "Input"}},
      {"name": "type", "type": "string", "interface": "select", "uiSchema": {"title": "Type", "type": "string", "x-component": "Select", "enum": [{"value": "api_key", "label": "API Key"}, {"value": "oauth2", "label": "OAuth 2.0"}, {"value": "ssh", "label": "SSH Key"}, {"value": "azure", "label": "Azure Service Principal"}, {"value": "gcloud", "label": "Google Cloud Service Account"}, {"value": "docker", "label": "Docker Registry"}, {"value": "database", "label": "Database Connection"}]}},
      {"name": "description", "type": "text", "interface": "textarea", "uiSchema": {"title": "Description", "type": "string", "x-component": "Input.TextArea"}},
      {"name": "rotatedAt", "type": "date", "interface": "datetime", "uiSchema": {"title": "Last Rotated", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": true}}},
      {"name": "expiresAt", "type": "date", "interface": "datetime", "uiSchema": {"title": "Expires At", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": true}}}
    ]
  }' | jq '.data.name // .errors'

# Create Executions Collection
echo "Creating Executions collection..."
curl -s "${API_URL}/collections:create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "executions",
    "title": "Executions",
    "autoGenId": true,
    "createdBy": true,
    "updatedBy": true,
    "sortable": true,
    "fields": [
      {"name": "agentType", "type": "string", "interface": "input", "uiSchema": {"title": "Agent Type", "type": "string", "x-component": "Input"}},
      {"name": "status", "type": "string", "interface": "select", "defaultValue": "pending", "uiSchema": {"title": "Status", "type": "string", "x-component": "Select", "enum": [{"value": "pending", "label": "Pending"}, {"value": "running", "label": "Running"}, {"value": "completed", "label": "Completed"}, {"value": "failed", "label": "Failed"}, {"value": "cancelled", "label": "Cancelled"}]}},
      {"name": "parameters", "type": "json", "interface": "json", "defaultValue": {}, "uiSchema": {"title": "Parameters", "type": "object", "x-component": "Input.JSON"}},
      {"name": "result", "type": "json", "interface": "json", "defaultValue": {}, "uiSchema": {"title": "Result", "type": "object", "x-component": "Input.JSON"}},
      {"name": "startedAt", "type": "date", "interface": "datetime", "uiSchema": {"title": "Started At", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": true}}},
      {"name": "finishedAt", "type": "date", "interface": "datetime", "uiSchema": {"title": "Finished At", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": true}}},
      {"name": "duration", "type": "integer", "interface": "integer", "uiSchema": {"title": "Duration (ms)", "type": "number", "x-component": "InputNumber"}}
    ]
  }' | jq '.data.name // .errors'

echo ""
echo "Collections created! Now creating menu items..."

# Create DevForge Menu Group
echo "Creating DevForge menu..."
MENU_RESPONSE=$(curl -s "${API_URL}/uiSchemas:insertAdjacent/nocobase-admin-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "type": "void",
      "title": "DevForge",
      "x-component": "Menu.SubMenu",
      "x-decorator": "ACLMenuItemProvider",
      "x-component-props": {
        "icon": "RocketOutlined"
      },
      "x-uid": "devforge-menu",
      "properties": {}
    }
  }')
echo "DevForge menu created"

# Create Projects Page
echo "Creating Projects page..."
curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "type": "void",
      "title": "Projects",
      "x-component": "Menu.Item",
      "x-decorator": "ACLMenuItemProvider",
      "x-component-props": {
        "icon": "FolderOutlined"
      },
      "x-uid": "devforge-projects-menu",
      "x-server-hooks": [
        {
          "type": "onSelfCreate",
          "method": "bindMenuItemToRole"
        }
      ],
      "properties": {
        "page": {
          "type": "void",
          "x-component": "Page",
          "x-uid": "devforge-projects-page",
          "properties": {
            "grid": {
              "type": "void",
              "x-component": "Grid",
              "x-initializer": "page:addBlock",
              "properties": {}
            }
          }
        }
      }
    }
  }' | jq '.data["x-uid"] // .errors'

# Create Agents Page
echo "Creating Agents page..."
curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "type": "void",
      "title": "Agents",
      "x-component": "Menu.Item",
      "x-decorator": "ACLMenuItemProvider",
      "x-component-props": {
        "icon": "RobotOutlined"
      },
      "x-uid": "devforge-agents-menu",
      "x-server-hooks": [
        {
          "type": "onSelfCreate",
          "method": "bindMenuItemToRole"
        }
      ],
      "properties": {
        "page": {
          "type": "void",
          "x-component": "Page",
          "x-uid": "devforge-agents-page",
          "properties": {
            "grid": {
              "type": "void",
              "x-component": "Grid",
              "x-initializer": "page:addBlock",
              "properties": {}
            }
          }
        }
      }
    }
  }' | jq '.data["x-uid"] // .errors'

# Create Workflows Page
echo "Creating Workflows page..."
curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "type": "void",
      "title": "Workflows",
      "x-component": "Menu.Item",
      "x-decorator": "ACLMenuItemProvider",
      "x-component-props": {
        "icon": "BranchesOutlined"
      },
      "x-uid": "devforge-workflows-menu",
      "x-server-hooks": [
        {
          "type": "onSelfCreate",
          "method": "bindMenuItemToRole"
        }
      ],
      "properties": {
        "page": {
          "type": "void",
          "x-component": "Page",
          "x-uid": "devforge-workflows-page",
          "properties": {
            "grid": {
              "type": "void",
              "x-component": "Grid",
              "x-initializer": "page:addBlock",
              "properties": {}
            }
          }
        }
      }
    }
  }' | jq '.data["x-uid"] // .errors'

# Create Credentials Page
echo "Creating Credentials page..."
curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "type": "void",
      "title": "Credentials",
      "x-component": "Menu.Item",
      "x-decorator": "ACLMenuItemProvider",
      "x-component-props": {
        "icon": "KeyOutlined"
      },
      "x-uid": "devforge-credentials-menu",
      "x-server-hooks": [
        {
          "type": "onSelfCreate",
          "method": "bindMenuItemToRole"
        }
      ],
      "properties": {
        "page": {
          "type": "void",
          "x-component": "Page",
          "x-uid": "devforge-credentials-page",
          "properties": {
            "grid": {
              "type": "void",
              "x-component": "Grid",
              "x-initializer": "page:addBlock",
              "properties": {}
            }
          }
        }
      }
    }
  }' | jq '.data["x-uid"] // .errors'

# Create Executions Page
echo "Creating Executions page..."
curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "type": "void",
      "title": "Executions",
      "x-component": "Menu.Item",
      "x-decorator": "ACLMenuItemProvider",
      "x-component-props": {
        "icon": "ThunderboltOutlined"
      },
      "x-uid": "devforge-executions-menu",
      "x-server-hooks": [
        {
          "type": "onSelfCreate",
          "method": "bindMenuItemToRole"
        }
      ],
      "properties": {
        "page": {
          "type": "void",
          "x-component": "Page",
          "x-uid": "devforge-executions-page",
          "properties": {
            "grid": {
              "type": "void",
              "x-component": "Grid",
              "x-initializer": "page:addBlock",
              "properties": {}
            }
          }
        }
      }
    }
  }' | jq '.data["x-uid"] // .errors'

echo ""
echo "==================================="
echo "DevForge setup complete!"
echo "==================================="
echo ""
echo "Created Collections:"
echo "  - projects"
echo "  - agents"
echo "  - devforge_workflows"
echo "  - credentials"
echo "  - executions"
echo ""
echo "Created Menu Items under DevForge:"
echo "  - Projects"
echo "  - Agents"
echo "  - Workflows"
echo "  - Credentials"
echo "  - Executions"
echo ""
echo "Visit https://devforge.ilinqsoft.com to access DevForge!"
echo ""
