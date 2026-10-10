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
              "minLength": 8,
              "maxLength": 128
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
            "kind": {
              "type": "string",
              "enum": [
                "canvas",
                "ui",
                "doc",
                "presentation",
                "music",
                "video"
              ]
            },
            "idempotencyKey": {
              "type": "string",
              "minLength": 8,
              "maxLength": 128
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
              "minLength": 8,
              "maxLength": 128
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
            },
            "ui": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "role": {
                  "type": "string",
                  "enum": [
                    "container",
                    "button",
                    "input",
                    "checkbox",
                    "card",
                    "navigation",
                    "badge"
                  ]
                },
                "label": {
                  "type": "string",
                  "maxLength": 500
                },
                "href": {
                  "type": "string",
                  "maxLength": 2048,
                  "pattern": "^(https?://|mailto:|#|/[^/])"
                },
                "layout": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "direction": {
                      "type": "string",
                      "enum": [
                        "row",
                        "column"
                      ]
                    },
                    "gap": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 10000
                    },
                    "padding": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 10000
                    },
                    "align": {
                      "type": "string",
                      "enum": [
                        "start",
                        "center",
                        "end"
                      ]
                    },
                    "justify": {
                      "type": "string",
                      "enum": [
                        "start",
                        "center",
                        "end",
                        "space-between"
                      ]
                    }
                  },
                  "required": [
                    "direction",
                    "gap",
                    "padding",
                    "align",
                    "justify"
                  ]
                },
                "animation": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "preset": {
                      "type": "string",
                      "enum": [
                        "fade",
                        "rise",
                        "scale",
                        "custom"
                      ]
                    },
                    "trigger": {
                      "type": "string",
                      "enum": [
                        "load",
                        "hover",
                        "click"
                      ]
                    },
                    "duration": {
                      "type": "number",
                      "minimum": 50,
                      "maximum": 60000
                    },
                    "delay": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 60000
                    },
                    "easing": {
                      "type": "string",
                      "enum": [
                        "linear",
                        "ease",
                        "ease-in",
                        "ease-out",
                        "ease-in-out"
                      ]
                    },
                    "repeat": {
                      "type": "boolean"
                    },
                    "distance": {
                      "type": "number",
                      "minimum": -10000,
                      "maximum": 10000
                    },
                    "keyframes": {
                      "type": "array",
                      "minItems": 2,
                      "maxItems": 100,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "offset": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "opacity": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "translateX": {
                            "type": "number",
                            "minimum": -10000,
                            "maximum": 10000
                          },
                          "translateY": {
                            "type": "number",
                            "minimum": -10000,
                            "maximum": 10000
                          },
                          "scale": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 100
                          },
                          "rotate": {
                            "type": "number",
                            "minimum": -36000,
                            "maximum": 36000
                          }
                        },
                        "required": [
                          "offset"
                        ]
                      }
                    }
                  },
                  "required": [
                    "preset",
                    "trigger",
                    "duration",
                    "delay",
                    "easing",
                    "repeat",
                    "distance"
                  ]
                },
                "component": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "name": {
                      "type": "string",
                      "maxLength": 120
                    },
                    "sourceId": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                    }
                  },
                  "required": [
                    "name"
                  ]
                }
              },
              "required": [
                "role"
              ]
            },
            "vectorFill": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "sourceId": {
                  "type": "string",
                  "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                },
                "overlap": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 10
                }
              },
              "required": [
                "sourceId",
                "overlap"
              ]
            },
            "pathData": {
              "type": "string",
              "maxLength": 200000,
              "pattern": "^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$"
            },
            "closed": {
              "type": "boolean"
            },
            "cornerRadius": {
              "type": "number",
              "minimum": 0,
              "maximum": 10000
            },
            "cornerRadii": {
              "type": "array",
              "minItems": 4,
              "maxItems": 4,
              "items": {
                "type": "number",
                "minimum": 0,
                "maximum": 10000
              }
            },
            "effects": {
              "type": "array",
              "maxItems": 20,
              "items": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "glow"
                        ]
                      },
                      "enabled": {
                        "type": "boolean"
                      },
                      "color": {
                        "type": "string",
                        "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                      },
                      "opacity": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                      },
                      "blur": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 200
                      },
                      "spread": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 200
                      },
                      "strength": {
                        "type": "number",
                        "minimum": 0.01,
                        "maximum": 10
                      },
                      "shape": {
                        "type": "string",
                        "enum": [
                          "contour",
                          "circle",
                          "rectangle"
                        ]
                      },
                      "falloff": {
                        "type": "number",
                        "minimum": 0.25,
                        "maximum": 4
                      },
                      "offsetX": {
                        "type": "number",
                        "minimum": -10000,
                        "maximum": 10000
                      },
                      "offsetY": {
                        "type": "number",
                        "minimum": -10000,
                        "maximum": 10000
                      }
                    },
                    "required": [
                      "id",
                      "type",
                      "enabled",
                      "color",
                      "opacity",
                      "blur",
                      "spread",
                      "strength"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "outline"
                        ]
                      },
                      "enabled": {
                        "type": "boolean"
                      },
                      "color": {
                        "type": "string",
                        "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                      },
                      "opacity": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                      },
                      "width": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 200
                      }
                    },
                    "required": [
                      "id",
                      "type",
                      "enabled",
                      "color",
                      "opacity",
                      "width"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "drop-shadow"
                        ]
                      },
                      "enabled": {
                        "type": "boolean"
                      },
                      "color": {
                        "type": "string",
                        "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                      },
                      "opacity": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                      },
                      "offsetX": {
                        "type": "number",
                        "minimum": -10000,
                        "maximum": 10000
                      },
                      "offsetY": {
                        "type": "number",
                        "minimum": -10000,
                        "maximum": 10000
                      },
                      "blur": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 200
                      },
                      "spread": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 200
                      }
                    },
                    "required": [
                      "id",
                      "type",
                      "enabled",
                      "color",
                      "opacity",
                      "offsetX",
                      "offsetY",
                      "blur",
                      "spread"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "gaussian-blur"
                        ]
                      },
                      "enabled": {
                        "type": "boolean"
                      },
                      "color": {
                        "type": "string",
                        "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                      },
                      "opacity": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                      },
                      "radius": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 200
                      }
                    },
                    "required": [
                      "id",
                      "type",
                      "enabled",
                      "radius"
                    ]
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "id": {
                        "type": "string",
                        "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "stylized-shadow"
                        ]
                      },
                      "enabled": {
                        "type": "boolean"
                      },
                      "color": {
                        "type": "string",
                        "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                      },
                      "opacity": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1
                      },
                      "angle": {
                        "type": "number",
                        "minimum": -36000,
                        "maximum": 36000
                      },
                      "distance": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 10000
                      }
                    },
                    "required": [
                      "id",
                      "type",
                      "enabled",
                      "color",
                      "opacity",
                      "angle",
                      "distance"
                    ]
                  }
                ]
              }
            },
            "scaleX": {
              "type": "number",
              "minimum": -100,
              "maximum": 100
            },
            "scaleY": {
              "type": "number",
              "minimum": -100,
              "maximum": 100
            },
            "strokeWidth": {
              "type": "number",
              "minimum": 0,
              "maximum": 10000
            },
            "blendMode": {
              "enum": [
                "normal",
                "multiply",
                "screen",
                "overlay",
                "darken",
                "lighten"
              ]
            },
            "fontFamily": {
              "type": "string",
              "maxLength": 200
            },
            "fontWeight": {
              "type": "number",
              "minimum": 1,
              "maximum": 1000
            },
            "textAlign": {
              "enum": [
                "left",
                "center",
                "right"
              ]
            },
            "fillPaint": {
              "oneOf": [
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "type",
                    "color"
                  ],
                  "properties": {
                    "type": {
                      "const": "solid"
                    },
                    "color": {
                      "type": "string",
                      "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "type",
                    "angle",
                    "stops"
                  ],
                  "properties": {
                    "type": {
                      "const": "linear-gradient"
                    },
                    "angle": {
                      "type": "number"
                    },
                    "stops": {
                      "type": "array",
                      "minItems": 2,
                      "maxItems": 20,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "id",
                          "offset",
                          "color"
                        ],
                        "properties": {
                          "id": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                          },
                          "offset": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "color": {
                            "type": "string",
                            "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                          }
                        }
                      }
                    }
                  }
                },
                {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "type",
                    "stops"
                  ],
                  "properties": {
                    "type": {
                      "const": "radial-gradient"
                    },
                    "stops": {
                      "type": "array",
                      "minItems": 2,
                      "maxItems": 20,
                      "items": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "id",
                          "offset",
                          "color"
                        ],
                        "properties": {
                          "id": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                          },
                          "offset": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "color": {
                            "type": "string",
                            "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                          }
                        }
                      }
                    }
                  }
                }
              ]
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
              "minLength": 8,
              "maxLength": 128
            }
          },
          "required": [
            "type",
            "x",
            "y",
            "ifMatchRevision"
          ]
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
                },
                "ui": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "role": {
                      "type": "string",
                      "enum": [
                        "container",
                        "button",
                        "input",
                        "checkbox",
                        "card",
                        "navigation",
                        "badge"
                      ]
                    },
                    "label": {
                      "type": "string",
                      "maxLength": 500
                    },
                    "href": {
                      "type": "string",
                      "maxLength": 2048,
                      "pattern": "^(https?://|mailto:|#|/[^/])"
                    },
                    "layout": {
                      "type": "object",
                      "additionalProperties": false,
                      "properties": {
                        "direction": {
                          "type": "string",
                          "enum": [
                            "row",
                            "column"
                          ]
                        },
                        "gap": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 10000
                        },
                        "padding": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 10000
                        },
                        "align": {
                          "type": "string",
                          "enum": [
                            "start",
                            "center",
                            "end"
                          ]
                        },
                        "justify": {
                          "type": "string",
                          "enum": [
                            "start",
                            "center",
                            "end",
                            "space-between"
                          ]
                        }
                      },
                      "required": [
                        "direction",
                        "gap",
                        "padding",
                        "align",
                        "justify"
                      ]
                    },
                    "animation": {
                      "type": "object",
                      "additionalProperties": false,
                      "properties": {
                        "preset": {
                          "type": "string",
                          "enum": [
                            "fade",
                            "rise",
                            "scale",
                            "custom"
                          ]
                        },
                        "trigger": {
                          "type": "string",
                          "enum": [
                            "load",
                            "hover",
                            "click"
                          ]
                        },
                        "duration": {
                          "type": "number",
                          "minimum": 50,
                          "maximum": 60000
                        },
                        "delay": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 60000
                        },
                        "easing": {
                          "type": "string",
                          "enum": [
                            "linear",
                            "ease",
                            "ease-in",
                            "ease-out",
                            "ease-in-out"
                          ]
                        },
                        "repeat": {
                          "type": "boolean"
                        },
                        "distance": {
                          "type": "number",
                          "minimum": -10000,
                          "maximum": 10000
                        },
                        "keyframes": {
                          "type": "array",
                          "minItems": 2,
                          "maxItems": 100,
                          "items": {
                            "type": "object",
                            "additionalProperties": false,
                            "properties": {
                              "offset": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              },
                              "opacity": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              },
                              "translateX": {
                                "type": "number",
                                "minimum": -10000,
                                "maximum": 10000
                              },
                              "translateY": {
                                "type": "number",
                                "minimum": -10000,
                                "maximum": 10000
                              },
                              "scale": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 100
                              },
                              "rotate": {
                                "type": "number",
                                "minimum": -36000,
                                "maximum": 36000
                              }
                            },
                            "required": [
                              "offset"
                            ]
                          }
                        }
                      },
                      "required": [
                        "preset",
                        "trigger",
                        "duration",
                        "delay",
                        "easing",
                        "repeat",
                        "distance"
                      ]
                    },
                    "component": {
                      "type": "object",
                      "additionalProperties": false,
                      "properties": {
                        "name": {
                          "type": "string",
                          "maxLength": 120
                        },
                        "sourceId": {
                          "type": "string",
                          "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                        }
                      },
                      "required": [
                        "name"
                      ]
                    }
                  },
                  "required": [
                    "role"
                  ]
                },
                "vectorFill": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "sourceId": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                    },
                    "overlap": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 10
                    }
                  },
                  "required": [
                    "sourceId",
                    "overlap"
                  ]
                },
                "pathData": {
                  "type": "string",
                  "maxLength": 200000,
                  "pattern": "^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$"
                },
                "closed": {
                  "type": "boolean"
                },
                "cornerRadius": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 10000
                },
                "cornerRadii": {
                  "type": "array",
                  "minItems": 4,
                  "maxItems": 4,
                  "items": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 10000
                  }
                },
                "effects": {
                  "type": "array",
                  "maxItems": 20,
                  "items": {
                    "oneOf": [
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "id": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "glow"
                            ]
                          },
                          "enabled": {
                            "type": "boolean"
                          },
                          "color": {
                            "type": "string",
                            "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                          },
                          "opacity": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "blur": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 200
                          },
                          "spread": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 200
                          },
                          "strength": {
                            "type": "number",
                            "minimum": 0.01,
                            "maximum": 10
                          },
                          "shape": {
                            "type": "string",
                            "enum": [
                              "contour",
                              "circle",
                              "rectangle"
                            ]
                          },
                          "falloff": {
                            "type": "number",
                            "minimum": 0.25,
                            "maximum": 4
                          },
                          "offsetX": {
                            "type": "number",
                            "minimum": -10000,
                            "maximum": 10000
                          },
                          "offsetY": {
                            "type": "number",
                            "minimum": -10000,
                            "maximum": 10000
                          }
                        },
                        "required": [
                          "id",
                          "type",
                          "enabled",
                          "color",
                          "opacity",
                          "blur",
                          "spread",
                          "strength"
                        ]
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "id": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "outline"
                            ]
                          },
                          "enabled": {
                            "type": "boolean"
                          },
                          "color": {
                            "type": "string",
                            "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                          },
                          "opacity": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "width": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 200
                          }
                        },
                        "required": [
                          "id",
                          "type",
                          "enabled",
                          "color",
                          "opacity",
                          "width"
                        ]
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "id": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "drop-shadow"
                            ]
                          },
                          "enabled": {
                            "type": "boolean"
                          },
                          "color": {
                            "type": "string",
                            "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                          },
                          "opacity": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "offsetX": {
                            "type": "number",
                            "minimum": -10000,
                            "maximum": 10000
                          },
                          "offsetY": {
                            "type": "number",
                            "minimum": -10000,
                            "maximum": 10000
                          },
                          "blur": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 200
                          },
                          "spread": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 200
                          }
                        },
                        "required": [
                          "id",
                          "type",
                          "enabled",
                          "color",
                          "opacity",
                          "offsetX",
                          "offsetY",
                          "blur",
                          "spread"
                        ]
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "id": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "gaussian-blur"
                            ]
                          },
                          "enabled": {
                            "type": "boolean"
                          },
                          "color": {
                            "type": "string",
                            "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                          },
                          "opacity": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "radius": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 200
                          }
                        },
                        "required": [
                          "id",
                          "type",
                          "enabled",
                          "radius"
                        ]
                      },
                      {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                          "id": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "stylized-shadow"
                            ]
                          },
                          "enabled": {
                            "type": "boolean"
                          },
                          "color": {
                            "type": "string",
                            "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                          },
                          "opacity": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                          },
                          "angle": {
                            "type": "number",
                            "minimum": -36000,
                            "maximum": 36000
                          },
                          "distance": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 10000
                          }
                        },
                        "required": [
                          "id",
                          "type",
                          "enabled",
                          "color",
                          "opacity",
                          "angle",
                          "distance"
                        ]
                      }
                    ]
                  }
                },
                "scaleX": {
                  "type": "number",
                  "minimum": -100,
                  "maximum": 100
                },
                "scaleY": {
                  "type": "number",
                  "minimum": -100,
                  "maximum": 100
                },
                "strokeWidth": {
                  "type": "number",
                  "minimum": 0,
                  "maximum": 10000
                },
                "blendMode": {
                  "enum": [
                    "normal",
                    "multiply",
                    "screen",
                    "overlay",
                    "darken",
                    "lighten"
                  ]
                },
                "fontFamily": {
                  "type": "string",
                  "maxLength": 200
                },
                "fontWeight": {
                  "type": "number",
                  "minimum": 1,
                  "maximum": 1000
                },
                "textAlign": {
                  "enum": [
                    "left",
                    "center",
                    "right"
                  ]
                },
                "fillPaint": {
                  "oneOf": [
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "type",
                        "color"
                      ],
                      "properties": {
                        "type": {
                          "const": "solid"
                        },
                        "color": {
                          "type": "string",
                          "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                        }
                      }
                    },
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "type",
                        "angle",
                        "stops"
                      ],
                      "properties": {
                        "type": {
                          "const": "linear-gradient"
                        },
                        "angle": {
                          "type": "number"
                        },
                        "stops": {
                          "type": "array",
                          "minItems": 2,
                          "maxItems": 20,
                          "items": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "id",
                              "offset",
                              "color"
                            ],
                            "properties": {
                              "id": {
                                "type": "string",
                                "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                              },
                              "offset": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              },
                              "color": {
                                "type": "string",
                                "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                              }
                            }
                          }
                        }
                      }
                    },
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "required": [
                        "type",
                        "stops"
                      ],
                      "properties": {
                        "type": {
                          "const": "radial-gradient"
                        },
                        "stops": {
                          "type": "array",
                          "minItems": 2,
                          "maxItems": 20,
                          "items": {
                            "type": "object",
                            "additionalProperties": false,
                            "required": [
                              "id",
                              "offset",
                              "color"
                            ],
                            "properties": {
                              "id": {
                                "type": "string",
                                "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
                              },
                              "offset": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 1
                              },
                              "color": {
                                "type": "string",
                                "pattern": "^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$"
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
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
              "minLength": 8,
              "maxLength": 128
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
  },
  {
    "name": "export_ui",
    "description": "Export a UI page as standalone HTML, CSS and interactive animations. Returns source, not a screenshot.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "documentId": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
        },
        "slideId": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$"
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
  }
];
