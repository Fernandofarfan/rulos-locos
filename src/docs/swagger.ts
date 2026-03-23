import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Rulos Locos API',
            version: '1.0.0',
            description: 'API pública para cotizaciones, arbitraje e indicadores económicos de Argentina.',
            contact: {
                name: 'Fernando Farfan',
            },
        },
        servers: [
            {
                url: '/api',
                description: 'Servidor Principal',
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Archivos con anotaciones
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
