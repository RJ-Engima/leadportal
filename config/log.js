const {
    createLogger,
    format,
    transports
} = require('winston');
const {
    combine,
    timestamp,
    label,
    printf
} = format;
const moment = require('moment');
const DailyRotateFile = require('winston-daily-rotate-file');


const myCustomColors = {
    colors: {
        level: 'green',
        error: 'red'
    }
};

const enumerateErrorFormat = require('winston').format(info => {
    if (info.message instanceof Error) {
        info.message = Object.assign({
            message: info.message.message,
            stack: info.message.stack,
        }, info.message);
    }
    if (info instanceof Error) {
        return Object.assign({
            message: info.message,
            stack: info.stack,
        }, info);
    }
    return info;
});

const myFormat = printf(info => {
    return `${info.level}: ${info.message} || timestamp: ${moment(info.timestamp).format('DD-MM-YYYY h:mm:s A')} `;
});

require('winston').addColors(myCustomColors.colors);
// instantiate a new Winston Logger with the settings defined above
var logger = createLogger({
    level: 'info',
    format: require('winston').format.combine(
        require('winston').format.timestamp(),
        enumerateErrorFormat()
    ),
    transports: [
        new DailyRotateFile({
            'format': combine(require('winston').format.simple(),myFormat),
            'filename': 'application-logs-%DATE%.log',
            'level': 'info',
            'maxSize': '20m',
            'maxFiles': '100d',
            'dirname': './app/logs'
        }),
        new transports.Console({
            format: combine(
                require('winston').format.colorize(),
                myFormat
            ),
            handleExceptions: true
        })
    ],
    exitOnError: false, // do not exit on handled exceptions
});


module.exports = logger;