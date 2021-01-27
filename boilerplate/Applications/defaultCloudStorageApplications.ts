import {Payload, WithType} from "../../gigya-cdp-sdk/entities/common";
import {Application, CloudStorageApplication} from "../../gigya-cdp-sdk/entities/Application";
import {ConnectorId} from "../../gigya-cdp-sdk/entities/Connector";
import {BusinessUnitId} from "../../gigya-cdp-sdk/entities";

export type CSType = 'AWS S3' | 'Microsoft Azure Blob' | 'Google Cloud Storage' | 'SFTP';

// TODO: please check application interface, below there is a type error (I have also tried without 'type:cloudstorage' and using CloudStorageApplication


// @ts-ignore
export const cloudStorageApplications: Record<CSType, Payload<CloudStorageApplication>> = {
    // @ts-ignore
    'AWS S3': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        configValues: {
            "writeBucketName": "my bucket",
            "readBucketName": "my bucket",
            "writeFileName": "zoeFile",
            "readFileNameRegex": "zoeFile",
            "writeFilePath": "zoe/",
            "readFilePath": "zoe/"
        },
        name: "AWS Application",
        description: "R&D test application for amazon s3",
    },
    // @ts-ignore
    'Microsoft Azure Blob': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        name: "Azure Application",
        description: "R&D test application for azure",
        configValues: {
            readContainer: "my container",
            readFileNameRegex: "zoe",
            readFilePath: "filePath",
            writeContainer: "my container",
            writeFileName: "zoe",
            writeFilePath: "filePath",
        },
    },
// @ts-ignore
    'Google Cloud Storage': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        name: "Google Cloud",
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
    },
    // @ts-ignore
    'SFTP': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
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
