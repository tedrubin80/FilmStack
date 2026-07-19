import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Basic swagger definition
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FestScout Festival API',
      version: '1.0.0',
      description: 'Festival management API for self-hosted FestScout (multi-tenant)',
      contact: {
        name: 'FestScout Maintainers',
        email: process.env.PLATFORM_CONTACT_EMAIL || 'support@example.com',
      },
      license: {
        name: 'AGPL-3.0',
        url: 'https://www.gnu.org/licenses/agpl-3.0.html',
      },
    },
    servers: [
      {
        url: process.env.API_URL || process.env.FESTIVAL_API_URL || 'http://localhost:3001',
        description: 'This instance',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
              },
              description: 'Additional error details',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok'],
            },
            service: {
              type: 'string',
            },
            version: {
              type: 'string',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            environment: {
              type: 'string',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            username: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            role: {
              type: 'string',
              enum: ['tenant_admin', 'judge', 'staff'],
            },
            tenant: {
              $ref: '#/components/schemas/Tenant',
            },
          },
        },
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            subdomain: {
              type: 'string',
            },
            planType: {
              type: 'string',
              enum: ['starter', 'professional', 'enterprise'],
            },
            settings: {
              type: 'object',
            },
          },
        },
        Festival: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            startDate: {
              type: 'string',
              format: 'date',
            },
            endDate: {
              type: 'string',
              format: 'date',
            },
            submissionDeadline: {
              type: 'string',
              format: 'date-time',
            },
            status: {
              type: 'string',
              enum: [
                'draft',
                'published',
                'submissions_open',
                'submissions_closed',
                'judging',
                'completed',
              ],
            },
            categories: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Category',
              },
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            entryFee: {
              type: 'number',
              format: 'float',
            },
            rules: {
              type: 'string',
            },
          },
        },
        Film: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            director: {
              type: 'string',
            },
            synopsis: {
              type: 'string',
            },
            duration: {
              type: 'integer',
              description: 'Duration in minutes',
            },
            genre: {
              type: 'string',
            },
            country: {
              type: 'string',
            },
            language: {
              type: 'string',
            },
            productionYear: {
              type: 'integer',
            },
            status: {
              type: 'string',
              enum: ['submitted', 'under_review', 'accepted', 'rejected'],
            },
            submissionDate: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Judge: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            bio: {
              type: 'string',
            },
            expertise: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password', 'tenantSubdomain'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
            },
            password: {
              type: 'string',
              minLength: 8,
            },
            tenantSubdomain: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: [
            'tenantName',
            'subdomain',
            'email',
            'adminName',
            'adminUsername',
            'adminPassword',
          ],
          properties: {
            tenantName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
            subdomain: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
            },
            email: {
              type: 'string',
              format: 'email',
            },
            adminName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
            adminUsername: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
            },
            adminPassword: {
              type: 'string',
              minLength: 8,
            },
            subscriptionTier: {
              type: 'string',
              enum: ['starter', 'professional', 'enterprise'],
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Tenants',
        description: 'Tenant management',
      },
      {
        name: 'Festivals',
        description: 'Festival management',
      },
      {
        name: 'Films',
        description: 'Film submissions management',
      },
      {
        name: 'Judges',
        description: 'Judge management',
      },
      {
        name: 'Payments',
        description: 'Payment processing',
      },
      {
        name: 'Video Rooms',
        description: 'Video room management for screenings',
      },
      {
        name: 'API Keys',
        description: 'API key management',
      },
      {
        name: 'Platform Admin',
        description: 'Platform administration endpoints',
      },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Check if the API is running and healthy',
          responses: {
            '200': {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthCheck',
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate a tenant admin user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Authentication successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AuthResponse',
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '401': {
              description: 'Authentication failed',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '429': {
              description: 'Too many requests',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register new tenant',
          description: 'Register a new tenant organization with admin user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RegisterRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Registration successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AuthResponse',
                  },
                },
              },
            },
            '400': {
              description: 'Validation or registration error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '429': {
              description: 'Too many requests',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Authentication'],
          summary: 'User logout',
          description: 'Logout user (client-side token removal)',
          security: [
            {
              bearerAuth: [],
            },
          ],
          responses: {
            '200': {
              description: 'Logout successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                      },
                      message: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user',
          description: 'Get current user information',
          security: [
            {
              bearerAuth: [],
            },
          ],
          responses: {
            '200': {
              description: 'User information retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                      },
                      data: {
                        type: 'object',
                        properties: {
                          user: {
                            $ref: '#/components/schemas/User',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '404': {
              description: 'User not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/check-subdomain/{subdomain}': {
        get: {
          tags: ['Authentication'],
          summary: 'Check subdomain availability',
          description: 'Check if a subdomain is available for registration',
          parameters: [
            {
              name: 'subdomain',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                minLength: 3,
                maxLength: 50,
                pattern: '^[a-z0-9-]+$',
              },
              description: 'Subdomain to check',
            },
          ],
          responses: {
            '200': {
              description: 'Subdomain availability check successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                      },
                      data: {
                        type: 'object',
                        properties: {
                          subdomain: {
                            type: 'string',
                          },
                          available: {
                            type: 'boolean',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid subdomain',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger page
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'FilmFestKit API Documentation',
    })
  );

  // Docs in JSON format
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export { specs };
