
import { APIGatewayProxyHandler } from 'aws-lambda';
import { validate } from 'jsonschema';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Schema for validation
const schema = {
    type: 'object',
    properties: {
        transactionId: { type: 'string' },
        userId: { type: 'string' },
        transactionDetails: {
            type: 'object',
            properties: {
                amount: { type: 'number' },
                currency: { type: 'string' },
                transactionDate: { type: 'string', format: 'date-time' },
                paymentMethod: { type: 'string' },
                merchantDetails: {
                    type: 'object',
                    properties: {
                        merchantId: { type: 'string' },
                        name: { type: 'string' },
                        category: { type: 'string' },
                        countryCode: { type: 'string' }
                    },
                    required: ['merchantId', 'name', 'category', 'countryCode']
                }
            },
            required: ['amount', 'currency', 'transactionDate', 'paymentMethod', 'merchantDetails']
        },
        userDetails: {
            type: 'object',
            properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
                billingAddress: {
                    type: 'object',
                    properties: {
                        street: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        postalCode: { type: 'string' },
                        country: { type: 'string' }
                    },
                    required: ['street', 'city', 'state', 'postalCode', 'country']
                }
            },
            required: ['firstName', 'lastName', 'email', 'phone', 'billingAddress']
        },
        additionalInfo: {
            type: 'object',
            properties: {
                deviceIp: { type: 'string', format: 'ipv4' },
                userAgent: { type: 'string' }
            },
            required: ['deviceIp', 'userAgent']
        }
    },
    required: ['transactionId', 'userId', 'transactionDetails', 'userDetails', 'additionalInfo']
};



// Data Validation Lambda Function


export const validateDataHandler: APIGatewayProxyHandler = async (event) => {
    const data = JSON.parse(event.body || '{}');
    const validationResult = validate(data, schema);

    if (!validationResult.valid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid data format', details: validationResult.errors })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Data validated successfully' })
    };
};




// Helper function for anonymization

const generatePseudonym = (input: string): string => {
    return crypto.createHash('sha256').update(input).digest('hex').substr(0, 10);
};




// Data Anonymization Lambda Function

export const anonymizeDataHandler: APIGatewayProxyHandler = async (event) => {
    const data = JSON.parse(event.body || '{}');

    data.userDetails.firstName = generatePseudonym(data.userDetails.firstName);
    data.userDetails.lastName = generatePseudonym(data.userDetails.lastName);
    data.userDetails.email = generatePseudonym(data.userDetails.email);
    data.userDetails.phone = generatePseudonym(data.userDetails.phone);
    data.userDetails.billingAddress.street = generatePseudonym(data.userDetails.billingAddress.street);
    data.userDetails.billingAddress.city = generatePseudonym(data.userDetails.billingAddress.city);
    data.userDetails.billingAddress.state = generatePseudonym(data.userDetails.billingAddress.state);
    data.userDetails.billingAddress.postalCode = generatePseudonym(data.userDetails.billingAddress.postalCode);

    return {
        statusCode: 200,
        body: JSON.stringify(data)
    };
};



// Helper function for encryption


const encryptData = (data: string, key: Buffer): string => {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};



// Data Encryption Lambda Function

export const encryptDataHandler: APIGatewayProxyHandler = async (event) => {
    const data = JSON.parse(event.body || '{}');
    const key = crypto.randomBytes(32); // AES-256 key

    const encryptedData = encryptData(JSON.stringify(data), key);

    return {
        statusCode: 200,
        body: JSON.stringify({ encryptedData, key: key.toString('hex') })
    };
};



// Helper function

const calculateRiskScore = (transaction: any): number => {
    let score = 0;
    if (transaction.amount > 1000) score += 5;
    if (transaction.currency !== 'USD') score += 3;
    // Add more risk factors...

    return score;
};



// Risk Assessment Lambda Function

export const riskAssessmentHandler: APIGatewayProxyHandler = async (event) => {
    const data = JSON.parse(event.body || '{}');
    const riskScore = calculateRiskScore(data.transactionDetails);

    return {
        statusCode: 200,
        body: JSON.stringify({ riskScore })
    };
};


// Data Storage Lambda Function

export const storeDataHandler: APIGatewayProxyHandler = async (event) => {
    const data = JSON.parse(event.body || '{}');

    const filePath = path.join('/mnt/data', 'processedData.json');
    fs.writeFileSync(filePath, JSON.stringify(data));

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Data stored successfully', filePath })
    };
};



// Data Retrieval Lambda Function

export const retrieveDataHandler: APIGatewayProxyHandler = async (event) => {
    const { filePath } = JSON.parse(event.body || '{}');

    const data = fs.readFileSync(path.join('/mnt/data', filePath), 'utf8');

    return {
        statusCode: 200,
        body: data
    };
};
g


// Example data for testing
const validData = {
    transactionId: "TXN123456789",
    userId: "USER98765",
    transactionDetails: {
        amount: 250.00,
        currency: "USD",
        transactionDate: "2024-04-18T12:34:56Z",
        paymentMethod: "CreditCard",
        merchantDetails: {
            merchantId: "MERCHANT12345",
            name: "Example Merchant",
            category: "Electronics",
            countryCode: "US"
        }
    },
    userDetails: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+11234567890",
        billingAddress: {
            street: "123 Elm St",
            city: "Anytown",
            state: "CA",
            postalCode: "90210",
            country: "USA"
        }
    },
    additionalInfo: {
        deviceIp: "192.168.1.1",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
    }
};

const invalidData = {
    transactionId: "TXN123456789"
};



//tests 

describe('validateDataHandler', () => {
    it('should return 200 for valid data', async () => {
        const event = { body: JSON.stringify(validData) };
        const result = await validateDataHandler(event as any);
        expect(result.statusCode).toBe(200);
    });

    it('should return 400 for invalid data', async () => {
        const event = { body: JSON.stringify(invalidData) };
        const result = await validateDataHandler(event as any);
        expect(result.statusCode).toBe(400);
    });
});
