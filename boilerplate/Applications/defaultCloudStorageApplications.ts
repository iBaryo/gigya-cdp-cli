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



export const cloudStorageApplications: Record<CSType, Payload<Application>> = {
    'amazon.s3': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        // resources: {
        //     type: 'amazon.s3',
        //     read: {
        //         "bucketName": "fake-bucket",
        //         "fileNameRegex": "fake/",
        //         "objectKeyPrefix": "fake",
        //     },
        //     write: {
        //         "bucketName": "fake-bucket",
        //         "fileNameRegex": "fake/",
        //         "objectKeyPrefix": "fake",
        //     },
        // },
        // predefinedActions: [],
        // predefinedEvents: [],
        configSchema: {
            "type": "object",
            // "allowAdditionalProperties": false,
            "required": [
                "readBucketName",
                "writeBucketName"
            ],
            "properties": {
                "readBucketName": {
                    "type": "string",
                    "title": "Read Bucket Name",
                    "description": "The S3 bucket to access.",
                    "scope": [
                        "application"
                    ] as ConfigOverrideScope[],
                },
                "writeBucketName": {
                    "type": "string",
                    "title": "Bucket Name",
                    "description": "The name of the Amazon S3 bucket to list.",
                    "scope": [
                        "application"
                    ] as ConfigOverrideScope[]
                },
                "readFilePath": {
                    "type": "string",
                    "title": "Read File Path",
                    "description": "The remote directory to retrieve files from.",
                    "scope": [
                        "application",
                        "event"
                    ] as ConfigOverrideScope[]
                },
                "writeFilePath": {
                    "type": "string",
                    "title": "Write File Path",
                    "description": "The name of the folder in S3 to which the file is written, followed by a forward slash. If no such folder exists, it will be created.",
                    "scope": [
                        "application",
                        "audience-action"
                    ] as ConfigOverrideScope[]
                },
                "readFileNameRegex": {
                    "type": "string",
                    "title": "FileName Regex",
                    "description": "A regular expression (regex) used for filtering files by name.",
                    "scope": [
                        "application",
                        "event"
                    ] as ConfigOverrideScope[]
                },
                "writeFileName": {
                    "type": "string",
                    "title": "File Name",
                    "description": "The format of the name of the file created. The name can include a fixed string or placeholders, denoted by a dollar sign '$' followed by curly brackets: ${variableName}. A range of different time stamp formats are supported. Time stamp conventions (e.g., YYYY) are also supported. now (the current time when the export job was started ); now-xD (the current time when the export job was started , minus 'x' number of days) now+xD (the current time when the export job was started , plus 'x' number of days); now+xD:yyMMdd; unix",
                    "scope": [
                        "application",
                        "audience-action"
                    ] as ConfigOverrideScope[]
                }
            }
        },
        configValues: {
            "writeBucketName": "fake-configValue",
            "readBucketName": "fake-configValue",
            "writeFileName": "fake-configValue",
            "readFileNameRegex": "fake-configValue",
            "writeFilePath": "fake-configValue",
            "readFilePath": "fake-configValue"
        },
        type: 'CloudStorage',
        enabled: false,
        logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
        name: "AWS Application",
        securitySchemes: {
            "keys": {
                "type": "object",
                // "allowAdditionalProperties": false,
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
        logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
        name: "Azure Application",
        securitySchemes: {
            "keys": {
                "type": "object",
                // "allowAdditionalProperties": false,
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
        // version: 0,
        configSchema: {
            "type": "object",
            // "allowAdditionalProperties": false,
            "required": [
                "readContainer",
                "writeContainer"
            ],
            "properties": {
                "readContainer": {
                    "type": "string",
                    "title": "Read Container",
                    "description": "The name of the container in the account from which to extract the data.",
                    "scope": [
                        "application"
                    ]
                },
                "writeContainer": {
                    "type": "string",
                    "title": "Container",
                    "description": "The name of the container in the account to which the data will be uploaded.",
                    "scope": [
                        "application"
                    ]
                },
                "readFilePath": {
                    "type": "string",
                    "title": "Blob Prefix",
                    "description": "If this parameter is specified, only blobs whose names begin with this prefix will be extracted.",
                    "scope": [
                        "application",
                        "event"
                    ]
                },
                "writeFilePath": {
                    "type": "string",
                    "title": "Blob Prefix",
                    "description": "The prefix to use for the blob names. Specify a prefix such as 'destination/' to create a virtual folder hierarchy.",
                    "scope": [
                        "application",
                        "action"
                    ]
                },
                "readFileNameRegex": {
                    "type": "string",
                    "title": "Filename Regex",
                    "description": "A regular expression (regex) applied for filtering files by name.",
                    "scope": [
                        "application",
                        "event"
                    ]
                },
                "writeFileName": {
                    "type": "string",
                    "title": "File Name",
                    "description": "The format of the name of the file created. The name can include a fixed string or placeholders, denoted by a dollar sign '$' followed by curly brackets: ${variableName}. A range of different time stamp formats are supported. Time stamp conventions (e.g., YYYY) are also supported. now (the current time when the export job was started ); now-xD (the current time when the export job was started , minus 'x' number of days) now+xD (the current time when the export job was started , plus 'x' number of days); now+xD:yyMMdd; unix",
                    "scope": [
                        "application",
                        "action"
                    ]
                }
            }
        }
    },

    'googlecloud': {
        connectorId: "" as ConnectorId,
        businessUnitId: "" as BusinessUnitId,
        logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
        enabled: false,
        name: "Google Cloud",
        securitySchemes: {
            "keys": {
                "type": "object",
                // "allowAdditionalProperties": false,
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
        configSchema: {
            "type": "object",
            // "allowAdditionalProperties": false,
            "required": [
                "readBucketName",
                "writeBucketName",
                "projectId"
            ],
            "properties": {
                "readBucketName": {
                    "type": "string",
                    "title": "Read Bucket Name",
                    "description": "The name of the bucket from which to read files.",
                    "scope": [
                        "application"
                    ]
                },
                "writeBucketName": {
                    "type": "string",
                    "title": "Write Bucket Name",
                    "description": "The name of the Google Cloud Platform bucket to which the file is written.",
                    "scope": [
                        "application"
                    ]
                },
                "projectId": {
                    "type": "string",
                    "title": "Project Id",
                    "description": "The ID of the project, as displayed in the Google Cloud service account file.",
                    "scope": [
                        "application"
                    ]
                },
                "readFilePath": {
                    "type": "string",
                    "title": "Object Key Prefix",
                    "description": "The prefix of the folder in Google Cloud Platform from which the file is read, for example: Specifying 'Test' will read from all the folders whose name begins with 'Test', e.g. Test1, Test2. Specifying 'Test1/a' will read all the files in Test1 whose name begins with 'a'. Leaving this value empty will read from all the folders in the bucket.",
                    "scope": [
                        "application",
                        "event"
                    ]
                },
                "writeFilePath": {
                    "type": "string",
                    "title": "Write File Path",
                    "description": "The name of the folder in Google Cloud Platform to which the file is written, followed by a backslash.",
                    "scope": [
                        "application",
                        "action"
                    ]
                },
                "readFileNameRegex": {
                    "type": "string",
                    "title": "Read Filename Regex",
                    "description": "A regular expression (regex) applied for filtering files by name.",
                    "scope": [
                        "application",
                        "event"
                    ]
                },
                "writeFileName": {
                    "type": "string",
                    "title": "File Name",
                    "description": "The format of the name of the file created. The name can include a fixed string or placeholders, denoted by a dollar sign '$' followed by curly brackets: ${variableName}. A range of different time stamp formats are supported. Time stamp conventions (e.g., YYYY) are also supported. now (the current time when the export job was started ); now-xD (the current time when the export job was started , minus 'x' number of days) now+xD (the current time when the export job was started , plus 'x' number of days); now+xD:yyMMdd; unix",
                    "scope": [
                        "application",
                        "action"
                    ]
                }
            },
        },
            configValues: {
                "projectId": "mapme-1502004780937",
                "writeBucketName": "cdp-ingest",
                "readBucketName": "cdp-ingest",
                "readFileNameRegex": "",
                "readFilePath": "",
                "writeFileName": "",
                "writeFilePath": ""
            },
            // version: 0,
            type: "CloudStorage"
        },



        'sftp': {
            connectorId: "" as ConnectorId,
            businessUnitId: "" as BusinessUnitId,
            logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
            enabled: false,
            name: "SFTP",
            securitySchemes: {
                "password": {
                    "type": "object",
                    // "allowAdditionalProperties": false,
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
                    // "allowAdditionalProperties": false,
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
            // resources: {
            //     "type": "sftp",
            //     "read": {
            //         "host": "$host",
            //         "port": "$port",
            //         "sortOrder": "$sortOrder",
            //         "sortBy": "$sortBy",
            //         "timeout": "$timeout",
            //         "fileNameRegex": "$readFileNameRegex",
            //         "remotePath": "$readFilePath"
            //     },
            //     "write": {
            //         "host": "$host",
            //         "port": "$port",
            //         "timeout": "$timeout",
            //         "remotePath": "$writeFilePath",
            //         "temporaryUploadExtension": "$temporaryUploadExtension",
            //         "fileName": "$writeFileName"
            //     }
            // },
            // predefinedActions: [],
            // predefinedEvents: [],
            configSchema: {
                "type": "object",
                // "allowAdditionalProperties": false,
                "required": [
                    "host",
                    "port"
                ],
                "properties": {
                    "host": {
                        "type": "string",
                        "title": "Host",
                        "description": "The remote SFTP host.",
                        "scope": [
                            "application"
                        ]
                    },
                    "readFilePath": {
                        "type": "string",
                        "title": "Read Remote Path",
                        "description": "The remote SFTP directory to fetch files from.",
                        "scope": [
                            "application",
                            "event"
                        ]
                    },
                    "writeFilePath": {
                        "type": "string",
                        "title": "Write Remote Path",
                        "description": "The remote SFTP directory to store files at.",
                        "scope": [
                            "application",
                            "action"
                        ]
                    },
                    "readFileNameRegex": {
                        "type": "string",
                        "title": "File Name Regex",
                        "description": "A regular expression to apply for file filtering.",
                        "scope": [
                            "application",
                            "event"
                        ]
                    },
                    "port": {
                        "type": "integer",
                        "title": "Port",
                        "description": "The remote SFTP port.",
                        "default": 22,
                        "scope": [
                            "application"
                        ]
                    },
                    "timeout": {
                        "type": "integer",
                        "title": "Timeout",
                        "description": "The timeout (in seconds) to wait for a response from SFTP. The acceptable range is 10-120.",
                        "default": 60,
                        "scope": [
                            "application"
                        ]
                    },
                    "sortBy": {
                        "type": "string",
                        "title": "Sort By",
                        "description": "The field by which to sort the data.",
                        "default": "time",
                        "scope": [
                            "application",
                            "event"
                        ]
                    },
                    "sortOrder": {
                        "type": "string",
                        "title": "Sort Order",
                        "description": "The sort order: ASC: ascending (this is the default) DESC: descending",
                        "default": "ASC",
                        "scope": [
                            "application",
                            "event"
                        ]
                    },
                    "temporaryUploadExtension": {
                        "type": "string",
                        "title": "Temporary Upload Extension",
                        "description": "Set to 'true' to append the extension '.uploading' to the file name while it is being uploaded. This extension will be removed when the uploading process is finished.",
                        "default": "false",
                        "scope": [
                            "application"
                        ]
                    },
                    "writeFileName": {
                        "type": "string",
                        "title": "File Name",
                        "description": "The format of the name of the file created. The name can include a fixed string or placeholders, denoted by a dollar sign '$' followed by curly brackets: ${variableName}. A range of different time stamp formats are supported. Time stamp conventions (e.g., YYYY) are also supported. now (the current time when the export job was started ); now-xD (the current time when the export job was started , minus 'x' number of days) now+xD (the current time when the export job was started , plus 'x' number of days); now+xD:yyMMdd; unix",
                        "scope": [
                            "application",
                            "action"
                        ]
                    }
                }
            },
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
            // version: 0,
            type: "CloudStorage"
        }
    }


    export const cloudStorageApplication = {
    businessUnitId: "",
    connectorId: "",
    pollingConfig: undefined,
    testResourcePath: "",
    configSchema: undefined,
    configValues: undefined,
    type: 'CloudStorage',
    enabled: false,
    logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
    name: "",
    securitySchemes: {},
    description: "R&D test application for amazon s3"
}

// TODO: zoe


/*
                           get all connectors from the applibrary
                           for each cloud storage connector
                           create an application -
                               name according to connector's
                               enabled: false
                               mock all other fields
                               mock auth & config
                               create an event
                                   name: `new customers from ${app.name}`
                                   purposes: basic
                                   mock settings & config
                                   create schema according to boilerplate
                                   create mapping
                                   no schedule
                        */
