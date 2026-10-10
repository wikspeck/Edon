export const tools = [
  {
    "name": "get_connection",
    "description": "Inspect local Edon connection",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "list_projects",
    "description": "List projects",
    "inputSchema": {
      "type": "object",
      "properties": {
        "cursor": {
          "type": "string"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "get_project",
    "description": "Read a project",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string"
        }
      },
      "required": [
        "projectId"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "create_project",
    "description": "Create a project",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "name"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 80
            },
            "description": {
              "type": "string",
              "maxLength": 500
            },
            "idempotencyKey": {
              "type": "string",
              "maxLength": 200
            }
          }
        }
      },
      "required": [
        "input"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "list_documents",
    "description": "List documents",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string"
        },
        "cursor": {
          "type": "string"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "get_document",
    "description": "Read a complete document",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        }
      },
      "required": [
        "documentId"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "create_document",
    "description": "Create a canvas document",
    "inputSchema": {
      "type": "object",
      "properties": {
        "input": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "name",
            "width",
            "height"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "width": {
              "type": "number",
              "minimum": 16,
              "maximum": 8192
            },
            "height": {
              "type": "number",
              "minimum": 16,
              "maximum": 8192
            },
            "projectId": {
              "type": "string",
              "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
            },
            "idempotencyKey": {
              "type": "string",
              "maxLength": 200
            }
          }
        }
      },
      "required": [
        "input"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "list_slides",
    "description": "List pages",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "cursor": {
          "type": "string"
        }
      },
      "required": [
        "documentId"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "create_slide",
    "description": "Create a page",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "input": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "ifMatchRevision"
          ],
          "properties": {
            "name": {
              "type": "string",
              "maxLength": 120
            },
            "width": {
              "type": "number",
              "minimum": 16,
              "maximum": 8192
            },
            "height": {
              "type": "number",
              "minimum": 16,
              "maximum": 8192
            },
            "background": {
              "type": "string",
              "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
            },
            "ifMatchRevision": {
              "type": "integer",
              "minimum": 1
            },
            "idempotencyKey": {
              "type": "string",
              "maxLength": 200
            }
          }
        }
      },
      "required": [
        "documentId",
        "input"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "list_elements",
    "description": "List structured layers",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "slideId": {
          "type": "string"
        },
        "cursor": {
          "type": "string"
        }
      },
      "required": [
        "documentId",
        "slideId"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "create_element",
    "description": "Create a shape, text or vector layer",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "slideId": {
          "type": "string"
        },
        "input": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "maxLength": 120
            },
            "parentId": {
              "oneOf": [
                {
                  "type": "string",
                  "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                },
                {
                  "type": "null"
                }
              ]
            },
            "x": {
              "type": "number"
            },
            "y": {
              "type": "number"
            },
            "width": {
              "type": "number",
              "minimum": 16,
              "maximum": 8192
            },
            "height": {
              "type": "number",
              "minimum": 16,
              "maximum": 8192
            },
            "rotation": {
              "type": "number"
            },
            "opacity": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            },
            "fill": {
              "type": "string",
              "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
            },
            "stroke": {
              "type": "string",
              "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
            },
            "text": {
              "type": "string",
              "maxLength": 50000
            },
            "fontSize": {
              "type": "number"
            },
            "visible": {
              "type": "boolean"
            },
            "locked": {
              "type": "boolean"
            },
            "imageUrl": {
              "type": "string",
              "pattern": "^data:image/(png|jpeg|webp|gif);base64,"
            },
            "type": {
              "enum": [
                "group",
                "frame",
                "rectangle",
                "ellipse",
                "line",
                "arrow",
                "polygon",
                "star",
                "path",
                "text",
                "image",
                "raster"
              ]
            },
            "ifMatchRevision": {
              "type": "integer",
              "minimum": 1
            },
            "idempotencyKey": {
              "type": "string",
              "maxLength": 200
            }
          },
          "required": [
            "type",
            "x",
            "y",
            "ifMatchRevision"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "documentId",
        "slideId",
        "input"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "update_element",
    "description": "Edit a layer using its current revision",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "slideId": {
          "type": "string"
        },
        "elementId": {
          "type": "string"
        },
        "input": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "patch",
            "ifMatchRevision"
          ],
          "properties": {
            "patch": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "name": {
                  "type": "string",
                  "maxLength": 120
                },
                "parentId": {
                  "oneOf": [
                    {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "x": {
                  "type": "number"
                },
                "y": {
                  "type": "number"
                },
                "width": {
                  "type": "number",
                  "minimum": 16,
                  "maximum": 8192
                },
                "height": {
                  "type": "number",
                  "minimum": 16,
                  "maximum": 8192
                },
                "rotation": {
                  "type": "number"
                },
                "opacity": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 1
                },
                "fill": {
                  "type": "string",
                  "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                },
                "stroke": {
                  "type": "string",
                  "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                },
                "text": {
                  "type": "string",
                  "maxLength": 50000
                },
                "fontSize": {
                  "type": "number"
                },
                "visible": {
                  "type": "boolean"
                },
                "locked": {
                  "type": "boolean"
                },
                "imageUrl": {
                  "type": "string",
                  "pattern": "^data:image/(png|jpeg|webp|gif);base64,"
                }
              }
            },
            "ifMatchRevision": {
              "type": "integer",
              "minimum": 1
            }
          }
        }
      },
      "required": [
        "documentId",
        "slideId",
        "elementId",
        "input"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "apply_operations",
    "description": "Atomically edit up to 50 layers/pages; dryRun validates without saving",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "input": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "ifMatchRevision",
            "operations"
          ],
          "properties": {
            "ifMatchRevision": {
              "type": "integer",
              "minimum": 1
            },
            "operations": {
              "type": "array",
              "minItems": 1,
              "maxItems": 50,
              "items": {
                "type": "object",
                "required": [
                  "op"
                ],
                "properties": {
                  "op": {
                    "enum": [
                      "create_slide",
                      "update_slide",
                      "delete_slide",
                      "create_element",
                      "update_element",
                      "delete_element"
                    ]
                  },
                  "slideId": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                  },
                  "elementId": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                  },
                  "slide": {
                    "type": "object"
                  },
                  "element": {
                    "type": "object"
                  },
                  "patch": {
                    "type": "object"
                  }
                }
              }
            },
            "dryRun": {
              "type": "boolean",
              "default": false
            },
            "idempotencyKey": {
              "type": "string",
              "maxLength": 200
            }
          }
        }
      },
      "required": [
        "documentId",
        "input"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": true,
      "openWorldHint": false
    }
  },
  {
    "name": "search_edon",
    "description": "Search the workspace",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string"
        },
        "cursor": {
          "type": "string"
        }
      },
      "required": [
        "query"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "open_document",
    "description": "Show a document in the editor",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        }
      },
      "required": [
        "documentId"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "get_preview",
    "description": "Render the current page as a PNG image",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "slideId": {
          "type": "string"
        }
      },
      "required": [
        "documentId"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "undo_document",
    "description": "Undo one edit in the open editor",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "ifMatchRevision": {
          "type": "integer",
          "minimum": 1
        }
      },
      "required": [
        "documentId",
        "ifMatchRevision"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    }
  },
  {
    "name": "redo_document",
    "description": "Redo one edit in the open editor",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string"
        },
        "ifMatchRevision": {
          "type": "integer",
          "minimum": 1
        }
      },
      "required": [
        "documentId",
        "ifMatchRevision"
      ],
      "additionalProperties": false
    },
    "annotations": {
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    }
  }
];
