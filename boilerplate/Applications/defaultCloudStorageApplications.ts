import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Event} from "../../gigya-cdp-sdk/entities/Event";
import {config} from "../BoilerplateConfig";
import {
    ApplicationType,
    CloudStorageResource,
    ResourceApplication
} from "../../gigya-cdp-sdk/entities/Application/ApplicationResource";
import {Application} from "../../gigya-cdp-sdk/entities/Application";
import {CloudStorageConnector, ConnectorId} from "../../gigya-cdp-sdk/entities/Connector";
import {BusinessUnitId} from "../../gigya-cdp-sdk/entities";
import {ConfigOverrideScope} from "../../gigya-cdp-sdk/entities/common/config";

export type CSType = 'amazon.s3' | 'azure.blob' | 'googlecloud' | 'sftp';

// TODO: take away ts-ignore by fixing Application interface --- some fields not needed

export const cloudStorageApplications: Record<CSType, Payload<Application>> = {
    // @ts-ignore
    'amazon.s3': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        configValues: {
            "writeBucketName": "fake-configValue",
            "readBucketName": "fake-configValue",
            "writeFileName": "fake-configValue",
            "readFileNameRegex": "fake-configValue",
            "writeFilePath": "fake-configValue",
            "readFilePath": "fake-configValue"
        },
        type: 'CloudStorage',
        name: "AWS Application",
        securitySchemes: {
            "keys": {
                "type": "object",
                "required": [
                    "accessKey",
                    "secretKey"
                ],
                "properties": {
                    "accessKey": {
                        "type": "string",
                        "title": "Access Key",
                        "description": "S3 access key"
                    },
                    "secretKey": {
                        "type": "string",
                        "title": "Secret Key",
                        "description": "S3 secret key"
                    }
                }
            }
        },
        description: "R&D test application for amazon s3",
    },

    'azure.blob': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        enabled: false,
        name: "Azure Application",
        securitySchemes: {
            "keys": {
                "type": "object",
                "required": [
                    "accountName",
                    "accountKey"
                ],
                "properties": {
                    "accountName": {
                        "title": "Account Name",
                        "description": "The name of the Azure account.",
                        "type": "string"
                    },
                    "accountKey": {
                        "title": "Account Key",
                        "description": "The Azure account key.",
                        "type": "string"
                    }
                },
            },
        },
        description: "R&D test application for azure",
        type: 'CloudStorage',
        configValues: {
            readContainer: "azure",
            readFileNameRegex: "azure",
            readFilePath: "azure",
            writeContainer: "azure",
            writeFileName: "azure",
            writeFilePath: "azure",
        },
    },

    'googlecloud': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        enabled: false,
        name: "Google Cloud",
        securitySchemes: {
            "keys": {
                "type": "object",
                "required": [
                    "clientEmail",
                    "privateKey"
                ],
                "properties": {
                    "clientEmail": {
                        "title": "Client Email",
                        "description": "The client email, as displayed in the Google Cloud service account file.",
                        "type": "string"
                    },
                    "privateKey": {
                        "title": "Private Key",
                        "description": "A base-64 encoding of the private key, as displayed in the Google Cloud service account file. Select the entire key, from '-----BEGIN PRIVATE KEY----- To ----END PRIVATE KEY-----', included. Apply base-64 encoding",
                        "type": "string"
                    }
                },
            },
        },
        description: "R&D test application for google cloud",
        configValues: {
            "projectId": "mapme-1502004780937",
            "writeBucketName": "cdp-ingest",
            "readBucketName": "cdp-ingest",
            "readFileNameRegex": "",
            "readFilePath": "",
            "writeFileName": "",
            "writeFilePath": ""
        },
        type: "CloudStorage"
    },


    'sftp': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        enabled: false,
        name: "SFTP",
        securitySchemes: {
            "password": {
                "type": "object",
                "required": [
                    "username",
                    "password"
                ],
                "properties": {
                    "username": {
                        "type": "string",
                        "title": "Username",
                        "description": "The remote SFTP username."
                    },
                    "password": {
                        "type": "string",
                        "title": "Password",
                        "description": "The remote SFTP password."
                    }
                }
            },
            "privateKey": {
                "type": "object",
                "required": [
                    "username",
                    "privateKey"
                ],
                "properties": {
                    "username": {
                        "type": "string",
                        "title": "Username",
                        "description": "The remote SFTP username."
                    },
                    "privateKey": {
                        "type": "string",
                        "title": "Private Key",
                        "description": "The base64 private key to use upon ssh keys authentication."
                    },
                    "passphrase": {
                        "type": "string",
                        "title": "Passphrase",
                        "description": "The private key passphrase."
                    }
                }
            }
        },
        description: "R&D test application for SFTP",
        configValues: {
            host: "fake-host",
            port: 22,
            readFileNameRegex: "sftp",
            readFilePath: "sftp",
            sortBy: "time",
            sortOrder: "ASC",
            temporaryUploadExtension: "false",
            timeout: 60,
            writeFileName: "sftp",
            writeFilePath: "sftp"
        },
        type: "CloudStorage"
    }
}
