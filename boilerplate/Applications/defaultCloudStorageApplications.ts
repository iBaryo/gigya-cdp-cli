import {Payload, WithEnabled, WithType} from "../../gigya-cdp-sdk/entities/common";
import {Application, CloudStorageApplication} from "../../gigya-cdp-sdk/entities/Application";
import {ConnectorId} from "../../gigya-cdp-sdk/entities/Connector";
import {BusinessUnitId} from "../../gigya-cdp-sdk/entities";
import {ServerOnlyFields} from "../../gigya-cdp-sdk/CDPEntitiesApi";
import {WithResources} from "../../gigya-cdp-sdk/entities/Application/ApplicationResource";
import {WithConfigSchema, WithConfigValues} from "../../gigya-cdp-sdk/entities/common/config";
import {WithSecuritySchemes} from "../../gigya-cdp-sdk/entities/Connector/Auth";

export type CSType = 'AWS S3' | 'Microsoft Azure Blob' | 'Google Cloud Storage' | 'SFTP';

type CSApplication = Omit<CloudStorageApplication,  ServerOnlyFields | keyof WithConfigSchema | keyof WithResources<any> | keyof WithSecuritySchemes | keyof WithEnabled | keyof WithType<any>>

export const cloudStorageApplications: Record<CSType, CSApplication> = {
    'AWS S3': {
        connectorId: "" as ConnectorId,
        configValues: {
            writeBucketName: "boilerplate-bucket",
            readBucketName: "boilerplate-bucket",
            writeFileName: "boilerplate-file",
            readFileNameRegex: "boilerplate-file",
            writeFilePath: "boilerplate-file/",
            readFilePath: "boilerplate-file/"
        },
        name: "AWS S3",
        description: "R&D test application for amazon s3",
    },
    'Microsoft Azure Blob': {
        connectorId: "" as ConnectorId,
        name: "Microsoft Azure Blob",
        description: "R&D test application for azure",
        configValues: {
            readContainer: "boilerplate-container",
            writeContainer: "boilerplate-container",
            writeFileName: "boilerplate-file",
            readFileNameRegex: "boilerplate-file",
            writeFilePath: "boilerplate-file/",
            readFilePath: "boilerplate-file/"
        },
    },
    'Google Cloud Storage': {
        connectorId: "" as ConnectorId,
        name: "Google Cloud Storage",
        description: "R&D test application for google cloud",
        configValues: {
            projectId: "id-1502004780937",
            readBucketName: "boilerplate-bucket",
            writeFileName: "boilerplate-file",
            readFileNameRegex: "boilerplate-file",
            writeFilePath: "boilerplate-file/",
            readFilePath: "boilerplate-file/",
            writeBucketName: "boilerplate-bucket",
        },
    },
    'SFTP': {
        connectorId: "" as ConnectorId,
        name: "SFTP",
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
    }
}
