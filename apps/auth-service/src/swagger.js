import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Auth Service API',
    description: 'API documentation for the Auth Service of the Multi-Vendor E-commerce platform.',
    version: '1.0.0',
  },
  host: 'localhost:6001',
  schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./main.ts'];

swaggerAutogen(outputFile, endpointsFiles, doc);
