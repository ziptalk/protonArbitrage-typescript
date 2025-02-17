export const log = (message: string | object) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };
    const timestamp = new Intl.DateTimeFormat('ko-KR', options).format(now);

    if (typeof message === 'object') {
        console.log(`[${timestamp}]`, JSON.stringify(message, (_, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
    } else {
        console.log(`[${timestamp}] ${message}`);
    }
};