const { createLogger, format, transports } = require('winston');

function createCustomLogger(logFileName) {
	return createLogger({
		level: 'info',
		format: format.combine(
			format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
			format.printf(
				({ level, message, timestamp }) =>
					`[${timestamp}] ${level.toUpperCase()}: ${message}`
			)
		),
		transports: [
			new transports.File({
				filename: `logs/${logFileName}.log`,
				level: 'info',
			}),
			new transports.Console({ format: format.simple() }),
		],
	});
}

module.exports = createCustomLogger;
