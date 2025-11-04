// src/config/database.ts

import { createPool, Pool, PoolOptions } from "mysql2/promise";
import dotenv from "dotenv";
import { error, info, success, warn } from "../utils/logger";

dotenv.config();

const createDbPool = (prefix: string): Pool => {
    const options: PoolOptions = {
        host: process.env[`${prefix}_DB_HOST`],
        port: parseInt(process.env[`${prefix}_DB_PORT`] || "3306", 10),
        user: process.env[`${prefix}_DB_USER`],
        password: process.env[`${prefix}_DB_PASSWORD`],
        database: process.env[`${prefix}_DB_NAME`],
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        namedPlaceholders: true, // Enable named placeholders for queries
    };

    info(
        `Attempting to connect to ${prefix} DB: ${options.user}@${options.host}:${options.port}/${options.database}`
    );
    return createPool(options);
};

const primaryPool = createDbPool("PRIMARY");
const replicaPool = createDbPool("REPLICA");

export const getPrimaryConnection = () => primaryPool;
export const getReplicaConnection = () => replicaPool;

export const testConnections = async (): Promise<void> => {
    try {
        const primaryConn = await primaryPool.getConnection();
        success("Primary database connection established successfully.");
        primaryConn.release();
    } catch (err: any) {
        error(`Failed to connect to Primary database: ${err.message}`);
        process.exit(1);
    }

    try {
        const replicaConn = await replicaPool.getConnection();
        success("Replica database connection established successfully.");
        replicaConn.release();
    } catch (err: any) {
        warn(
            `Failed to connect to Replica database. Read operations might fail. Error: ${err.message}`
        );
        // Do not exit here, replica might be temporarily down or not critical for some read paths
    }
};

export const closePools = async (): Promise<void> => {
    try {
        await primaryPool.end();
        success("Primary database connection pool closed.");
    } catch (err: any) {
        error(`Error closing primary pool: ${err.message}`);
    }

    try {
        await replicaPool.end();
        success("Replica database connection pool closed.");
    } catch (err: any) {
        error(`Error closing replica pool: ${err.message}`);
    }
};

// This allows testing the database connections directly when running this file
if (require.main === module) {
    (async () => {
        info("Running database connection tests...");
        await testConnections();
        await closePools();
        info("Database connection tests finished.");
    })();
}
