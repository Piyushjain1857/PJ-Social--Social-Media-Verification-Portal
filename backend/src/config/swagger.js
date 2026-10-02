/**
 * OpenAPI 3.0.0 Specification for Social Media Verification Portal API
 */

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PJ Social | Social Media Activity Verification & Gamification Portal API',
    version: '1.0.0',
    description: `
### Overview
Enterprise-grade REST API powering the Social Media Activity Verification Portal with a 3-tier Role-Based Access Control (RBAC) governance model:
- **Normal User (Creator)**: Submits activity proofs, tracks XP/levels, views position timeline, checks leaderboard rank, views real-time XP graph.
- **Admin (Moderator)**: Reviews pending activity submissions, inspects creator dossiers and gamification history, moderates content.
- **Super Admin (Governor)**: Configures global level curve, manages portal users, issues manual point bonuses/adjustments, audits system activity.

### Authentication
Authenticate requests using the **Authorize** button with a JSON Web Token (JWT):
\`Bearer <your_token>\`

Tokens are obtained via \`POST /api/auth/login\` or \`POST /api/auth/register\`.
    `,
    contact: {
      name: 'PJ Social Platform Engineering',
      email: 'engineering@pjsocial.portal'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'Current API Gateway (/api)'
    },
    {
      url: 'http://localhost:5001/api',
      description: 'Local Development Server (Port 5001)'
    },
    {
      url: 'http://localhost:5002/api',
      description: 'Fallback Development Server (Port 5002)'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token: "Bearer <token>"'
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Detailed error explanation' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'c37a7b8e-3298-4c12-8874-9c011e4bf5aa' },
          name: { type: 'string', example: 'Sarah Connor' },
          email: { type: 'string', format: 'email', example: 'user@portal.com' },
          role: { type: 'string', enum: ['USER', 'ADMIN', 'SUPER_ADMIN'], example: 'USER' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
          points: { type: 'integer', example: 751 },
          totalXP: { type: 'integer', example: 751 },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      GamificationProfile: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Sarah Connor' },
          totalXP: { type: 'integer', example: 751 },
          currentLevel: { type: 'integer', example: 4 },
          levelName: { type: 'string', example: 'Pathfinder' },
          levelMinXP: { type: 'integer', example: 750 },
          nextLevelMinXP: { type: 'integer', example: 1000 },
          xpIntoCurrentLevel: { type: 'integer', example: 1 },
          xpRemaining: { type: 'integer', example: 249 },
          progressPercentage: { type: 'number', example: 0.4 },
          rank: { type: 'integer', example: 1 },
          totalParticipants: { type: 'integer', example: 128 },
          percentileAhead: { type: 'number', example: 99.2 },
          recentXP: { type: 'integer', example: 120 }
        }
      },
      RankMetrics: {
        type: 'object',
        properties: {
          rank: { type: 'integer', example: 24 },
          totalParticipants: { type: 'integer', example: 486 },
          usersBehind: { type: 'integer', example: 462 },
          percentileAhead: { type: 'number', example: 95.0 },
          xpToNextRank: { type: 'integer', example: 15 }
        }
      },
      XPChartPoint: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2026-10-01' },
          xp: { type: 'integer', example: 751 },
          level: { type: 'integer', example: 4 },
          levelName: { type: 'string', example: 'Pathfinder' }
        }
      },
      RankHistoryItem: {
        type: 'object',
        properties: {
          month: { type: 'string', example: '2026-04' },
          label: { type: 'string', example: 'April 2026' },
          rank: { type: 'integer', example: 24 },
          totalParticipants: { type: 'integer', example: 486 },
          percentileAhead: { type: 'number', example: 95.0 }
        }
      },
      RankHistoryResponse: {
        type: 'object',
        properties: {
          trend: { type: 'string', enum: ['upward', 'downward', 'stable'], example: 'upward' },
          initialRank: { type: 'integer', example: 87 },
          currentRank: { type: 'integer', example: 24 },
          rankDiff: { type: 'integer', example: 63 },
          timeline: {
            type: 'array',
            items: { $ref: '#/components/schemas/RankHistoryItem' }
          }
        }
      },
      LevelTier: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          levelNumber: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Novice' },
          description: { type: 'string', example: 'First steps in the ecosystem' },
          xpRequired: { type: 'integer', example: 250 },
          cumulativeXP: { type: 'integer', example: 0 },
          nextThreshold: { type: 'integer', example: 250 },
          isActive: { type: 'boolean', example: true }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    // SYSTEM & HEALTH
    '/health': {
      get: {
        tags: ['System & Diagnostics'],
        summary: 'Check API Server Health',
        security: [],
        responses: {
          200: {
            description: 'API is healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/info': {
      get: {
        tags: ['System & Diagnostics'],
        summary: 'System Environment & Telemetry Info',
        security: [],
        responses: {
          200: {
            description: 'Environment and system details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/database/status': {
      get: {
        tags: ['System & Diagnostics'],
        summary: 'Check PostgreSQL Database Connectivity',
        security: [],
        responses: {
          200: {
            description: 'PostgreSQL connection status',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },

    // AUTHENTICATION
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a New Creator User',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Mercer' },
                  email: { type: 'string', format: 'email', example: 'alex@example.com' },
                  password: { type: 'string', format: 'password', example: 'StrongP@ss123' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User successfully registered' },
          400: { description: 'Validation error or email already in use' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate User and Receive JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@portal.com' },
                  password: { type: 'string', format: 'password', example: 'User123!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated successfully with token and user object' },
          401: { description: 'Invalid credentials or inactive account' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get Authenticated User Session Profile',
        responses: {
          200: { description: 'Current authenticated user profile' },
          401: { description: 'Unauthorized' }
        }
      }
    },

    // GAMIFICATION & GAME POINTS
    '/gamification/me': {
      get: {
        tags: ['Gamification & Game Points'],
        summary: 'Get Personal Gamification Dashboard Summary',
        description: 'Returns total XP, current dynamic level, level progress, remaining XP, real database rank, total eligible participants, percentile ahead, and 30-day recent XP.',
        responses: {
          200: {
            description: 'Gamification summary for logged-in user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GamificationProfile' } } }
          },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/gamification/me/rank': {
      get: {
        tags: ['Gamification & Game Points'],
        summary: 'Get Real-Time Database Rank & Percentile',
        description: 'Computes current leaderboard rank, total eligible users, users behind, and calculated percentile strictly in PostgreSQL.',
        responses: {
          200: {
            description: 'Personal rank metrics',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RankMetrics' } } }
          }
        }
      }
    },
    '/gamification/me/chart': {
      get: {
        tags: ['Gamification & Game Points'],
        summary: 'Get Cumulative XP Progression Chart Data',
        description: 'Calculates chronological cumulative XP progression over time with corresponding level titles for chart rendering.',
        parameters: [
          {
            name: 'timeframe',
            in: 'query',
            description: 'Timeframe window for XP progression',
            required: false,
            schema: {
              type: 'string',
              enum: ['7d', '30d', '3m', '6m', 'all_time'],
              default: '30d'
            }
          }
        ],
        responses: {
          200: {
            description: 'Chronological list of data points',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/XPChartPoint' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/gamification/me/rank-history': {
      get: {
        tags: ['Gamification & Game Points'],
        summary: 'Get Historical Rank & Trajectory Timeline',
        description: 'Returns monthly snapshots showing historical rank changes, initial rank, current rank, and overall trend (upward, downward, stable).',
        responses: {
          200: {
            description: 'Rank timeline and trajectory analysis',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RankHistoryResponse' } } }
          }
        }
      }
    },
    '/gamification/me/history': {
      get: {
        tags: ['Gamification & Game Points'],
        summary: 'Get Paginated XP Activity Ledger',
        description: 'Returns user transactions enriched with icons (❤️ Like, 💬 Comment, 📱 Story, 🎁 Bonus), source platforms, XP amounts, and dates.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'source', in: 'query', schema: { type: 'string' } },
          { name: 'action', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Paginated activity history' }
        }
      }
    },
    '/gamification/leaderboard': {
      get: {
        tags: ['Gamification & Game Points'],
        summary: 'Get Global Leaderboard',
        parameters: [
          {
            name: 'timeframe',
            in: 'query',
            schema: { type: 'string', enum: ['all_time', 'this_month', 'this_week'], default: 'all_time' }
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          200: { description: 'Ranked list of top participants' }
        }
      }
    },
    '/gamification/levels': {
      get: {
        tags: ['Gamification & Game Points'],
        summary: 'Get Complete Database Level Journey Tiers',
        description: 'Returns all configured dynamic level tiers with cumulative XP requirements.',
        responses: {
          200: {
            description: 'List of active level tiers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/LevelTier' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/gamification/user/{userId}': {
      get: {
        tags: ['Gamification & Game Points'],
        summary: 'Admin Inspect User Gamification Profile',
        description: 'Restricted to ADMIN and SUPER_ADMIN roles. Normal users receive 403 Forbidden.',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Target user gamification dossier' },
          403: { description: 'Forbidden for normal users' }
        }
      }
    },

    // POINTS & TRANSACTIONS
    '/points/me': {
      get: {
        tags: ['Points & Transactions'],
        summary: 'Get User Points Balance Summary',
        responses: {
          200: { description: 'Current point balance and summary' }
        }
      }
    },
    '/points/adjust': {
      post: {
        tags: ['Points & Transactions'],
        summary: 'Manual Points Adjustment (Super Admin Only)',
        description: 'Exclusive to Super Admin. Credit or debit creator points with audit reason.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'points', 'reason'],
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  points: { type: 'integer', example: 50 },
                  reason: { type: 'string', example: 'Campaign excellence bonus' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Points adjusted successfully' },
          403: { description: 'Forbidden: Requires SUPER_ADMIN' }
        }
      }
    },

    // SUBMISSIONS
    '/submissions': {
      get: {
        tags: ['Submissions & Proofs'],
        summary: 'Get Submissions List (Filtered by Role / Query)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } }
        ],
        responses: {
          200: { description: 'List of submissions' }
        }
      },
      post: {
        tags: ['Submissions & Proofs'],
        summary: 'Submit Activity Proof (Creator)',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['activityType', 'platform', 'postUrl', 'screenshot'],
                properties: {
                  activityType: { type: 'string', enum: ['LIKE', 'COMMENT', 'STORY'] },
                  platform: { type: 'string', enum: ['INSTAGRAM', 'TWITTER', 'FACEBOOK', 'YOUTUBE', 'TIKTOK'] },
                  postUrl: { type: 'string', format: 'uri' },
                  screenshot: { type: 'string', format: 'binary' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Proof submitted successfully, queued for moderation' }
        }
      }
    },

    // REVIEWS & MODERATION
    '/reviews/{id}/approve': {
      post: {
        tags: ['Admin Reviews & Moderation'],
        summary: 'Approve Submission Proof & Award XP',
        description: 'Moderator action (ADMIN or SUPER_ADMIN). Grants points/XP according to activity type.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Submission approved and XP awarded' },
          409: { description: 'Submission already processed' }
        }
      }
    },
    '/reviews/{id}/reject': {
      post: {
        tags: ['Admin Reviews & Moderation'],
        summary: 'Reject Submission Proof',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  reason: { type: 'string', example: 'Screenshot does not clearly show activity.' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Submission marked as rejected' }
        }
      }
    },

    // SUPER ADMIN LEVEL MANAGEMENT
    '/admin/levels': {
      get: {
        tags: ['Super Admin Level Engine'],
        summary: 'Get All Configured Dynamic Levels',
        responses: {
          200: { description: 'Complete levels array' }
        }
      },
      post: {
        tags: ['Super Admin Level Engine'],
        summary: 'Create a New Level Tier',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['levelNumber', 'name', 'xpRequired'],
                properties: {
                  levelNumber: { type: 'integer', example: 51 },
                  name: { type: 'string', example: 'Mythic Legend' },
                  description: { type: 'string', example: 'Elite apex status' },
                  xpRequired: { type: 'integer', example: 1000 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Level created' }
        }
      }
    },
    '/admin/levels/generate': {
      post: {
        tags: ['Super Admin Level Engine'],
        summary: 'Bulk Generate Standard Level Curve',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['count', 'baseXP', 'confirm'],
                properties: {
                  count: { type: 'integer', example: 50 },
                  baseXP: { type: 'integer', example: 250 },
                  growthRate: { type: 'number', example: 1.0 },
                  confirm: { type: 'boolean', example: true }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Levels bulk regenerated' }
        }
      }
    },

    // USER GOVERNANCE
    '/superadmin/users': {
      get: {
        tags: ['Super Admin Governance'],
        summary: 'List All Registered Users with Roles & Status',
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['USER', 'ADMIN', 'SUPER_ADMIN'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'User directory' }
        }
      }
    },
    '/superadmin/audit-logs': {
      get: {
        tags: ['Super Admin Governance'],
        summary: 'Retrieve Immutable System Security Audit Logs',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'Audit log entries' }
        }
      }
    },

    // ADMIN GAMIFICATION GOVERNANCE
    '/admin/gamification/analytics': {
      get: {
        tags: ['Admin Gamification Management'],
        summary: 'Get Platform-Wide Gamification Analytics & Distribution',
        responses: {
          200: { description: 'Gamification analytics telemetry' }
        }
      }
    },
    '/admin/gamification/users': {
      get: {
        tags: ['Admin Gamification Management'],
        summary: 'List Creators with XP, Level, Rank, and Filters',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'level', in: 'query', schema: { type: 'integer' } },
          { name: 'minXP', in: 'query', schema: { type: 'integer' } },
          { name: 'maxXP', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['highest_xp', 'lowest_xp', 'highest_level', 'lowest_level', 'recent_activity', 'name'] } }
        ],
        responses: {
          200: { description: 'Paginated creator gamification list' }
        }
      }
    },
    '/admin/gamification/users/{id}': {
      get: {
        tags: ['Admin Gamification Management'],
        summary: 'Get Complete Creator Gamification Dossier',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Creator gamification details' }
        }
      }
    },
    '/admin/gamification/users/{id}/adjust-xp': {
      post: {
        tags: ['Admin Gamification Management'],
        summary: 'Manually Adjust Creator XP (Admin / Super Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'reason'],
                properties: {
                  type: { type: 'string', enum: ['ADD', 'REMOVE'], default: 'ADD' },
                  amount: { type: 'integer', example: 50 },
                  reason: { type: 'string', example: 'Event participation bonus' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'XP adjusted and audit logged successfully' },
          400: { description: 'Validation error' },
          403: { description: 'Forbidden' }
        }
      }
    },
    '/admin/gamification/users/{id}/history': {
      get: {
        tags: ['Admin Gamification Management'],
        summary: 'Get Creator Paginated XP History Ledger',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
        ],
        responses: {
          200: { description: 'User XP transactions' }
        }
      }
    },
    '/super-admin/gamification/overview': {
      get: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'Super Admin Overview Telemetry',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Full platform gamification overview metrics' },
          403: { description: 'Super Admin privileges required' }
        }
      }
    },
    '/super-admin/gamification/users': {
      get: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'All Platform Users Gamification Directory',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'List of users with rank, level and weekly/monthly velocity' }
        }
      }
    },
    '/super-admin/gamification/admins': {
      get: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'All Admins Gamification Activity',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Moderator and admin gamification performance stats' }
        }
      }
    },
    '/super-admin/gamification/transactions': {
      get: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'XP Transaction Explorer',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'action', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Every platform point transaction' }
        }
      }
    },
    '/super-admin/gamification/analytics': {
      get: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'Super Admin Advanced Gamification Analytics',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'XP over time, users by level, activity contribution' }
        }
      }
    },
    '/super-admin/gamification/settings': {
      get: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'Get Gamification Activity Points Configuration',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Active points configuration for LIKE, COMMENT, STORY' }
        }
      },
      put: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'Update Gamification Activity Points Configuration',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  updates: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        activity: { type: 'string', example: 'LIKE' },
                        xp: { type: 'integer', example: 5 },
                        isActive: { type: 'boolean', example: true }
                      }
                    }
                  },
                  reason: { type: 'string', example: 'Promotional advocacy campaign' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Updated gamification settings' }
        }
      }
    },
    '/super-admin/gamification/users/{id}/adjust-xp': {
      post: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'Super Admin Manual XP Adjustment with Explicit Reason',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'reason'],
                properties: {
                  type: { type: 'string', enum: ['ADD', 'REMOVE'], default: 'ADD' },
                  amount: { type: 'integer', example: 100 },
                  reason: { type: 'string', example: 'Super Admin institutional merit award' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'XP adjusted and audit logged successfully' }
        }
      }
    },
    '/super-admin/gamification/audit-logs': {
      get: {
        tags: ['Super Admin Gamification Control Center'],
        summary: 'Gamification Audit Logs',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Gamification audit trail entries' }
        }
      }
    }
  }
};

module.exports = swaggerSpec;
