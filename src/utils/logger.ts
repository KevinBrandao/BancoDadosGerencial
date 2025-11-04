enum LogLevel {
    INFO = "INFO",
    SUCCESS = "SUCCESS",
    WARN = "WARN",
    ERROR = "ERROR",
}

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",

    fgBlack: "\x1b[30m",
    fgRed: "\x1b[31m",
    fgGreen: "\x1b[32m",
    fgYellow: "\x1b[33m",
    fgBlue: "\x1b[34m",
    fgMagenta: "\x1b[35m",
    fgCyan: "\x1b[36m",
    fgWhite: "\x1b[37m",
    fgGray: "\x1b[90m",

    bgBlack: "\x1b[40m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
    bgWhite: "\x1b[47m",
};

const getTimestamp = (): string => {
    const now = new Date();
    return now.toISOString().replace(/T/, " ").replace(/\..+/, "");
};

const log = (level: LogLevel, message: string, ...args: any[]): void => {
    let color = colors.fgWhite; // Default
    let bgColor = "";

    switch (level) {
        case LogLevel.INFO:
            color = colors.fgCyan;
            break;
        case LogLevel.SUCCESS:
            color = colors.fgGreen;
            break;
        case LogLevel.WARN:
            color = colors.fgYellow;
            break;
        case LogLevel.ERROR:
            color = colors.fgRed;
            bgColor = colors.bgBlack; // Add black background for errors
            break;
    }

    console.log(
        `${bgColor}${color}${colors.bright}[${level}]${colors.reset} ${
            colors.fgGray
        }[${getTimestamp()}]${colors.reset}${message}`,
        ...args
    );
};

export const info = (message: string, ...args: any[]) =>
    log(LogLevel.INFO, message, ...args);
export const success = (message: string, ...args: any[]) =>
    log(LogLevel.SUCCESS, message, ...args);
export const warn = (message: string, ...args: any[]) =>
    log(LogLevel.WARN, message, ...args);
export const error = (message: string, ...args: any[]) =>
    log(LogLevel.ERROR, message, ...args);
