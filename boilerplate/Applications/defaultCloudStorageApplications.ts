import { WithEnabled, WithType} from "../../gigya-cdp-sdk/entities/common";
import {ServerOnlyFields} from "../../gigya-cdp-sdk/CDPEntitiesApi";
import {WithConfigSchema} from "../../gigya-cdp-sdk/entities/common/config";
import {WithSecuritySchemes} from "../../gigya-cdp-sdk/entities/Connector/Auth";
import {CloudStorageApplication} from "../../gigya-cdp-sdk/entities/Application/CloudStorageApplication";
import {WithCloudStorageResources} from "../../gigya-cdp-sdk/entities/Application/ApplicationResource";

export type CSType = 'AWS S3' | 'Microsoft Azure Blob' | 'Google Cloud Storage' | 'SFTP';

type CSApplication = Omit<CloudStorageApplication,  ServerOnlyFields | keyof WithConfigSchema | keyof WithCloudStorageResources | keyof WithSecuritySchemes | keyof WithEnabled | keyof WithType<any>>

export const cloudStorageApplications: Record<CSType, CSApplication> = {
    'AWS S3': {
        category: "Cloud Storage",
        originConnectorId: "",
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
        category: "Cloud Storage",
        originConnectorId: "",
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
        category: "Cloud Storage",
        originConnectorId: "",
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
        category: "Cloud Storage",
        originConnectorId: "",
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
