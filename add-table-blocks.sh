#!/bin/bash

# Add Table Blocks to DevForge Pages
API_URL="https://devforge.ilinqsoft.com/api"

# Get token
TOKEN=$(curl -s "${API_URL}/auth:signIn" \
  -H "Content-Type: application/json" \
  -d '{"account":"admin@nocobase.com","password":"admin123"}' | jq -r ".data.token")

echo "Token: ${TOKEN:0:20}..."

# Page UIDs (from menu structure)
PROJECTS_UID="cn1vz2jfj92"
AGENTS_UID="yqgmym44for"
WORKFLOWS_UID="36pwjtctjgm"
CREDENTIALS_UID="0fju9prew2u"
EXECUTIONS_UID="pj8ro1n3wkw"

# Get page schema to find the grid UID
get_grid_uid() {
  local menu_uid=$1
  curl -s "${API_URL}/uiSchemas:getJsonSchema/${menu_uid}" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.data.properties.page.properties.grid["x-uid"] // empty'
}

# Function to add table block to a page
add_table_block() {
  local grid_uid=$1
  local collection=$2
  local title=$3
  local fields=$4

  echo "Adding $title table to grid $grid_uid..."

  curl -s "${API_URL}/uiSchemas:insertAdjacent/${grid_uid}?position=beforeEnd" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"schema\": {
        \"type\": \"void\",
        \"x-component\": \"Grid.Row\",
        \"properties\": {
          \"col\": {
            \"type\": \"void\",
            \"x-component\": \"Grid.Col\",
            \"properties\": {
              \"block\": {
                \"type\": \"void\",
                \"x-decorator\": \"TableBlockProvider\",
                \"x-decorator-props\": {
                  \"collection\": \"${collection}\",
                  \"dataSource\": \"main\",
                  \"action\": \"list\",
                  \"params\": {\"pageSize\": 20},
                  \"rowKey\": \"id\",
                  \"showIndex\": true,
                  \"dragSort\": false
                },
                \"x-component\": \"CardItem\",
                \"x-component-props\": {\"title\": \"${title}\"},
                \"properties\": {
                  \"actions\": {
                    \"type\": \"void\",
                    \"x-component\": \"ActionBar\",
                    \"x-component-props\": {\"style\": {\"marginBottom\": 16}},
                    \"properties\": {
                      \"filter\": {
                        \"type\": \"void\",
                        \"title\": \"{{t(\\\"Filter\\\")}}\",
                        \"x-action\": \"filter\",
                        \"x-component\": \"Filter.Action\",
                        \"x-use-component-props\": \"useFilterActionProps\",
                        \"x-component-props\": {\"icon\": \"FilterOutlined\"},
                        \"x-align\": \"left\"
                      },
                      \"refresh\": {
                        \"type\": \"void\",
                        \"title\": \"{{t(\\\"Refresh\\\")}}\",
                        \"x-action\": \"refresh\",
                        \"x-component\": \"Action\",
                        \"x-use-component-props\": \"useRefreshActionProps\",
                        \"x-component-props\": {\"icon\": \"ReloadOutlined\"},
                        \"x-align\": \"left\"
                      },
                      \"create\": {
                        \"type\": \"void\",
                        \"title\": \"{{t(\\\"Add new\\\")}}\",
                        \"x-action\": \"create\",
                        \"x-component\": \"Action\",
                        \"x-component-props\": {\"type\": \"primary\", \"icon\": \"PlusOutlined\", \"openMode\": \"drawer\"},
                        \"x-align\": \"right\",
                        \"properties\": {
                          \"drawer\": {
                            \"type\": \"void\",
                            \"title\": \"Add ${title}\",
                            \"x-component\": \"Action.Container\",
                            \"x-component-props\": {\"className\": \"nb-action-popup\"},
                            \"properties\": {
                              \"grid\": {
                                \"type\": \"void\",
                                \"x-component\": \"Grid\",
                                \"x-initializer\": \"popup:addNew:addBlock\",
                                \"properties\": {}
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  \"table\": {
                    \"type\": \"array\",
                    \"x-component\": \"TableV2\",
                    \"x-use-component-props\": \"useTableBlockProps\",
                    \"x-component-props\": {
                      \"rowKey\": \"id\",
                      \"rowSelection\": {\"type\": \"checkbox\"}
                    },
                    \"properties\": ${fields}
                  }
                }
              }
            }
          }
        }
      }
    }" | jq '.data["x-uid"] // .errors[0].message // "Created"'
}

# Projects table fields
PROJECTS_FIELDS='{
  "name": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "x-component-props": {"width": 200}, "properties": {"name": {"x-collection-field": "projects.name", "x-component": "CollectionField", "x-read-pretty": true}}},
  "slug": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"slug": {"x-collection-field": "projects.slug", "x-component": "CollectionField", "x-read-pretty": true}}},
  "status": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"status": {"x-collection-field": "projects.status", "x-component": "CollectionField", "x-read-pretty": true}}},
  "repositoryUrl": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"repositoryUrl": {"x-collection-field": "projects.repositoryUrl", "x-component": "CollectionField", "x-read-pretty": true}}},
  "createdAt": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"createdAt": {"x-collection-field": "projects.createdAt", "x-component": "CollectionField", "x-read-pretty": true}}}
}'

# Agents table fields
AGENTS_FIELDS='{
  "name": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "x-component-props": {"width": 200}, "properties": {"name": {"x-collection-field": "agents.name", "x-component": "CollectionField", "x-read-pretty": true}}},
  "type": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"type": {"x-collection-field": "agents.type", "x-component": "CollectionField", "x-read-pretty": true}}},
  "status": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"status": {"x-collection-field": "agents.status", "x-component": "CollectionField", "x-read-pretty": true}}},
  "endpoint": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"endpoint": {"x-collection-field": "agents.endpoint", "x-component": "CollectionField", "x-read-pretty": true}}},
  "lastHealthCheck": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"lastHealthCheck": {"x-collection-field": "agents.lastHealthCheck", "x-component": "CollectionField", "x-read-pretty": true}}}
}'

# Workflows table fields
WORKFLOWS_FIELDS='{
  "name": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "x-component-props": {"width": 200}, "properties": {"name": {"x-collection-field": "devforge_workflows.name", "x-component": "CollectionField", "x-read-pretty": true}}},
  "trigger": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"trigger": {"x-collection-field": "devforge_workflows.trigger", "x-component": "CollectionField", "x-read-pretty": true}}},
  "enabled": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"enabled": {"x-collection-field": "devforge_workflows.enabled", "x-component": "CollectionField", "x-read-pretty": true}}},
  "createdAt": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"createdAt": {"x-collection-field": "devforge_workflows.createdAt", "x-component": "CollectionField", "x-read-pretty": true}}}
}'

# Credentials table fields
CREDENTIALS_FIELDS='{
  "name": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "x-component-props": {"width": 200}, "properties": {"name": {"x-collection-field": "credentials.name", "x-component": "CollectionField", "x-read-pretty": true}}},
  "type": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"type": {"x-collection-field": "credentials.type", "x-component": "CollectionField", "x-read-pretty": true}}},
  "description": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"description": {"x-collection-field": "credentials.description", "x-component": "CollectionField", "x-read-pretty": true}}},
  "expiresAt": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"expiresAt": {"x-collection-field": "credentials.expiresAt", "x-component": "CollectionField", "x-read-pretty": true}}}
}'

# Executions table fields
EXECUTIONS_FIELDS='{
  "agentType": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"agentType": {"x-collection-field": "executions.agentType", "x-component": "CollectionField", "x-read-pretty": true}}},
  "status": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"status": {"x-collection-field": "executions.status", "x-component": "CollectionField", "x-read-pretty": true}}},
  "startedAt": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"startedAt": {"x-collection-field": "executions.startedAt", "x-component": "CollectionField", "x-read-pretty": true}}},
  "finishedAt": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"finishedAt": {"x-collection-field": "executions.finishedAt", "x-component": "CollectionField", "x-read-pretty": true}}},
  "duration": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"duration": {"x-collection-field": "executions.duration", "x-component": "CollectionField", "x-read-pretty": true}}}
}'

echo ""
echo "Getting grid UIDs for each page..."

# Get grid UIDs
PROJECTS_GRID=$(get_grid_uid $PROJECTS_UID)
AGENTS_GRID=$(get_grid_uid $AGENTS_UID)
WORKFLOWS_GRID=$(get_grid_uid $WORKFLOWS_UID)
CREDENTIALS_GRID=$(get_grid_uid $CREDENTIALS_UID)
EXECUTIONS_GRID=$(get_grid_uid $EXECUTIONS_UID)

echo "Projects grid: $PROJECTS_GRID"
echo "Agents grid: $AGENTS_GRID"
echo "Workflows grid: $WORKFLOWS_GRID"
echo "Credentials grid: $CREDENTIALS_GRID"
echo "Executions grid: $EXECUTIONS_GRID"

echo ""
echo "Adding table blocks..."

# Add tables to each page
if [ -n "$PROJECTS_GRID" ]; then
  add_table_block "$PROJECTS_GRID" "projects" "Projects" "$PROJECTS_FIELDS"
fi

if [ -n "$AGENTS_GRID" ]; then
  add_table_block "$AGENTS_GRID" "agents" "Agents" "$AGENTS_FIELDS"
fi

if [ -n "$WORKFLOWS_GRID" ]; then
  add_table_block "$WORKFLOWS_GRID" "devforge_workflows" "Workflows" "$WORKFLOWS_FIELDS"
fi

if [ -n "$CREDENTIALS_GRID" ]; then
  add_table_block "$CREDENTIALS_GRID" "credentials" "Credentials" "$CREDENTIALS_FIELDS"
fi

if [ -n "$EXECUTIONS_GRID" ]; then
  add_table_block "$EXECUTIONS_GRID" "executions" "Executions" "$EXECUTIONS_FIELDS"
fi

echo ""
echo "=========================================="
echo "Table blocks added to DevForge pages!"
echo "=========================================="
echo ""
echo "Visit https://devforge.ilinqsoft.com"
echo "Login: admin@nocobase.com / admin123"
echo ""
