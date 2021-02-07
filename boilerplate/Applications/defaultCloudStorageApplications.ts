import {Payload, WithEnabled, WithType} from "../../gigya-cdp-sdk/entities/common";
import {Application, CloudStorageApplication} from "../../gigya-cdp-sdk/entities/Application";
import {ConnectorId} from "../../gigya-cdp-sdk/entities/Connector";
import {BusinessUnitId} from "../../gigya-cdp-sdk/entities";
import {ServerOnlyFields} from "../../gigya-cdp-sdk/CDPEntitiesApi";
import {WithResources} from "../../gigya-cdp-sdk/entities/Application/ApplicationResource";
import {WithConfigSchema, WithConfigValues} from "../../gigya-cdp-sdk/entities/common/config";
import {WithSecuritySchemes} from "../../gigya-cdp-sdk/entities/Connector/Auth";

export type CSType = 'amazon.s3' | 'azure.blob' | 'googlecloud' | 'sftp';

// TODO: please check application interface, below there is a type error (I have also tried without 'type:cloudstorage' and using CloudStorageApplication

type CSApplication = Omit<CloudStorageApplication,  ServerOnlyFields | keyof WithConfigSchema | keyof WithResources<any> | keyof WithSecuritySchemes | keyof WithEnabled | keyof WithType<any>>

// @ts-ignore
export const cloudStorageApplications: Record<CSType, CSApplication> = {
    'amazon.s3': {
        connectorId: "" as ConnectorId,
        configValues: {
            writeBucketName: "boilerplate-bucket",
            readBucketName: "boilerplate-bucket",
            writeFileName: "boilerplate-file",
            readFileNameRegex: "boilerplate-file",
            writeFilePath: "boilerplate-file/",
            readFilePath: "boilerplate-file/"
        },
        name: "AWS Application",
        description: "R&D test application for amazon s3",
    },
    'azure.blob': {
        connectorId: "" as ConnectorId,
        name: "Azure Application",
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
    'googlecloud': {
        connectorId: "" as ConnectorId,
        name: "Google Cloud",
        description: "R&D test application for google cloud",
        configValues: {
            projectId: "id-1502004780937",
            readBucketName: "boilerplate-bucket",
            writeFileName: "boilerplate-file",
            readFileNameRegex: "boilerplate-file",
            writeFilePath: "boilerplate-file/",
            readFilePath: "boilerplate-file/",
            objectKeyPrefix: "prefix"
        },
    },
    'sftp': {
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
