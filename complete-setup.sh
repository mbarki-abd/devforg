#!/bin/bash

API_URL="https://devforge.ilinqsoft.com/api"

# Get token
TOKEN=$(curl -s "${API_URL}/auth:signIn" \
  -H "Content-Type: application/json" \
  -d '{"account":"admin@nocobase.com","password":"admin123"}' | jq -r ".data.token")

echo "Token obtained: ${TOKEN:0:20}..."

# Add Agents page
echo "Adding Agents page..."
cat > /tmp/agents.json << 'EOFAGENTS'
{
  "schema": {
    "type": "void",
    "title": "Agents",
    "x-component": "Menu.Item",
    "x-decorator": "ACLMenuItemProvider",
    "x-component-props": {"icon": "RobotOutlined"},
    "x-server-hooks": [{"type": "onSelfCreate", "method": "bindMenuItemToRole"}],
    "properties": {
      "page": {
        "type": "void",
        "x-component": "Page",
        "properties": {
          "grid": {
            "type": "void",
            "x-component": "Grid",
            "x-initializer": "page:addBlock",
            "properties": {
              "row1": {
                "type": "void",
                "x-component": "Grid.Row",
                "properties": {
                  "col1": {
                    "type": "void",
                    "x-component": "Grid.Col",
                    "properties": {
                      "block": {
                        "type": "void",
                        "x-decorator": "TableBlockProvider",
                        "x-decorator-props": {
                          "collection": "agents",
                          "dataSource": "main",
                          "action": "list",
                          "params": {"pageSize": 20},
                          "rowKey": "id"
                        },
                        "x-component": "CardItem",
                        "x-component-props": {"title": "Agents"},
                        "properties": {
                          "actions": {
                            "type": "void",
                            "x-component": "ActionBar",
                            "x-component-props": {"style": {"marginBottom": 16}},
                            "properties": {
                              "create": {
                                "type": "void",
                                "title": "Add new",
                                "x-action": "create",
                                "x-component": "Action",
                                "x-component-props": {"type": "primary", "icon": "PlusOutlined", "openMode": "drawer"}
                              }
                            }
                          },
                          "table": {
                            "type": "array",
                            "x-component": "TableV2",
                            "x-use-component-props": "useTableBlockProps",
                            "x-component-props": {"rowKey": "id", "rowSelection": {"type": "checkbox"}},
                            "properties": {
                              "name": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"name": {"x-collection-field": "agents.name", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "type": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"type": {"x-collection-field": "agents.type", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "status": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"status": {"x-collection-field": "agents.status", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "endpoint": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"endpoint": {"x-collection-field": "agents.endpoint", "x-component": "CollectionField", "x-read-pretty": true}}}
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
EOFAGENTS

curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-main-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/agents.json | jq '.data["x-uid"] // .errors'

# Add Workflows page
echo "Adding Workflows page..."
cat > /tmp/workflows.json << 'EOFWORKFLOWS'
{
  "schema": {
    "type": "void",
    "title": "Workflows",
    "x-component": "Menu.Item",
    "x-decorator": "ACLMenuItemProvider",
    "x-component-props": {"icon": "BranchesOutlined"},
    "x-server-hooks": [{"type": "onSelfCreate", "method": "bindMenuItemToRole"}],
    "properties": {
      "page": {
        "type": "void",
        "x-component": "Page",
        "properties": {
          "grid": {
            "type": "void",
            "x-component": "Grid",
            "x-initializer": "page:addBlock",
            "properties": {
              "row1": {
                "type": "void",
                "x-component": "Grid.Row",
                "properties": {
                  "col1": {
                    "type": "void",
                    "x-component": "Grid.Col",
                    "properties": {
                      "block": {
                        "type": "void",
                        "x-decorator": "TableBlockProvider",
                        "x-decorator-props": {
                          "collection": "devforge_workflows",
                          "dataSource": "main",
                          "action": "list",
                          "params": {"pageSize": 20},
                          "rowKey": "id"
                        },
                        "x-component": "CardItem",
                        "x-component-props": {"title": "Workflows"},
                        "properties": {
                          "actions": {
                            "type": "void",
                            "x-component": "ActionBar",
                            "x-component-props": {"style": {"marginBottom": 16}},
                            "properties": {
                              "create": {
                                "type": "void",
                                "title": "Add new",
                                "x-action": "create",
                                "x-component": "Action",
                                "x-component-props": {"type": "primary", "icon": "PlusOutlined", "openMode": "drawer"}
                              }
                            }
                          },
                          "table": {
                            "type": "array",
                            "x-component": "TableV2",
                            "x-use-component-props": "useTableBlockProps",
                            "x-component-props": {"rowKey": "id", "rowSelection": {"type": "checkbox"}},
                            "properties": {
                              "name": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"name": {"x-collection-field": "devforge_workflows.name", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "trigger": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"trigger": {"x-collection-field": "devforge_workflows.trigger", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "enabled": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"enabled": {"x-collection-field": "devforge_workflows.enabled", "x-component": "CollectionField", "x-read-pretty": true}}}
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
EOFWORKFLOWS

curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-main-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/workflows.json | jq '.data["x-uid"] // .errors'

# Add Credentials page
echo "Adding Credentials page..."
cat > /tmp/credentials.json << 'EOFCREDENTIALS'
{
  "schema": {
    "type": "void",
    "title": "Credentials",
    "x-component": "Menu.Item",
    "x-decorator": "ACLMenuItemProvider",
    "x-component-props": {"icon": "KeyOutlined"},
    "x-server-hooks": [{"type": "onSelfCreate", "method": "bindMenuItemToRole"}],
    "properties": {
      "page": {
        "type": "void",
        "x-component": "Page",
        "properties": {
          "grid": {
            "type": "void",
            "x-component": "Grid",
            "x-initializer": "page:addBlock",
            "properties": {
              "row1": {
                "type": "void",
                "x-component": "Grid.Row",
                "properties": {
                  "col1": {
                    "type": "void",
                    "x-component": "Grid.Col",
                    "properties": {
                      "block": {
                        "type": "void",
                        "x-decorator": "TableBlockProvider",
                        "x-decorator-props": {
                          "collection": "credentials",
                          "dataSource": "main",
                          "action": "list",
                          "params": {"pageSize": 20},
                          "rowKey": "id"
                        },
                        "x-component": "CardItem",
                        "x-component-props": {"title": "Credentials"},
                        "properties": {
                          "actions": {
                            "type": "void",
                            "x-component": "ActionBar",
                            "x-component-props": {"style": {"marginBottom": 16}},
                            "properties": {
                              "create": {
                                "type": "void",
                                "title": "Add new",
                                "x-action": "create",
                                "x-component": "Action",
                                "x-component-props": {"type": "primary", "icon": "PlusOutlined", "openMode": "drawer"}
                              }
                            }
                          },
                          "table": {
                            "type": "array",
                            "x-component": "TableV2",
                            "x-use-component-props": "useTableBlockProps",
                            "x-component-props": {"rowKey": "id", "rowSelection": {"type": "checkbox"}},
                            "properties": {
                              "name": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"name": {"x-collection-field": "credentials.name", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "type": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"type": {"x-collection-field": "credentials.type", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "description": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"description": {"x-collection-field": "credentials.description", "x-component": "CollectionField", "x-read-pretty": true}}}
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
EOFCREDENTIALS

curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-main-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/credentials.json | jq '.data["x-uid"] // .errors'

# Add Executions page
echo "Adding Executions page..."
cat > /tmp/executions.json << 'EOFEXECUTIONS'
{
  "schema": {
    "type": "void",
    "title": "Executions",
    "x-component": "Menu.Item",
    "x-decorator": "ACLMenuItemProvider",
    "x-component-props": {"icon": "ThunderboltOutlined"},
    "x-server-hooks": [{"type": "onSelfCreate", "method": "bindMenuItemToRole"}],
    "properties": {
      "page": {
        "type": "void",
        "x-component": "Page",
        "properties": {
          "grid": {
            "type": "void",
            "x-component": "Grid",
            "x-initializer": "page:addBlock",
            "properties": {
              "row1": {
                "type": "void",
                "x-component": "Grid.Row",
                "properties": {
                  "col1": {
                    "type": "void",
                    "x-component": "Grid.Col",
                    "properties": {
                      "block": {
                        "type": "void",
                        "x-decorator": "TableBlockProvider",
                        "x-decorator-props": {
                          "collection": "executions",
                          "dataSource": "main",
                          "action": "list",
                          "params": {"pageSize": 20},
                          "rowKey": "id"
                        },
                        "x-component": "CardItem",
                        "x-component-props": {"title": "Executions"},
                        "properties": {
                          "actions": {
                            "type": "void",
                            "x-component": "ActionBar",
                            "x-component-props": {"style": {"marginBottom": 16}},
                            "properties": {
                              "refresh": {
                                "type": "void",
                                "title": "Refresh",
                                "x-action": "refresh",
                                "x-component": "Action",
                                "x-component-props": {"icon": "ReloadOutlined"}
                              }
                            }
                          },
                          "table": {
                            "type": "array",
                            "x-component": "TableV2",
                            "x-use-component-props": "useTableBlockProps",
                            "x-component-props": {"rowKey": "id", "rowSelection": {"type": "checkbox"}},
                            "properties": {
                              "agentType": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"agentType": {"x-collection-field": "executions.agentType", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "status": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"status": {"x-collection-field": "executions.status", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "startedAt": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"startedAt": {"x-collection-field": "executions.startedAt", "x-component": "CollectionField", "x-read-pretty": true}}},
                              "duration": {"type": "void", "x-decorator": "TableV2.Column.Decorator", "x-component": "TableV2.Column", "properties": {"duration": {"x-collection-field": "executions.duration", "x-component": "CollectionField", "x-read-pretty": true}}}
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
EOFEXECUTIONS

curl -s "${API_URL}/uiSchemas:insertAdjacent/devforge-main-menu?position=beforeEnd" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/executions.json | jq '.data["x-uid"] // .errors'

echo ""
echo "=========================================="
echo "DevForge setup complete!"
echo "=========================================="
echo "Visit: https://devforge.ilinqsoft.com"
echo "Login: admin@nocobase.com / admin123"
