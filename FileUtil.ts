const fs = require('node:fs');
const path = require('path');

const TELEGRAM_TOKEN_FILE_NAME = "BMO_token.txt";
const CLOUDFLARE_TOKEN_FILE_NAME = "cloudflare_token.txt";
const CLOUDFLARE_ZONE_FILE_NAME = "cloudflare_zone_id.txt";
const BOT_DATA = "bot_data.json";

let botData: BotData | null = null;

export function getBMOToken(): string {
    // assume same directory        
    let filename = path.join(__dirname, TELEGRAM_TOKEN_FILE_NAME);
    return fs.readFileSync(filename, 'utf8');
}

export function getCloudflareToken(): string {
    // assume same directory        
    let filename = path.join(__dirname, CLOUDFLARE_TOKEN_FILE_NAME);
    return fs.readFileSync(filename, 'utf8');
}

export function getCloudflareZone(): string {
    // assume same directory        
    let filename = path.join(__dirname, CLOUDFLARE_ZONE_FILE_NAME);
    return fs.readFileSync(filename, 'utf8');
}

interface BotData {
    messagesAllowed: boolean,
    currentIPv6: string
}

// If objects are added to this type the get function needs to use a different copy function
const defaultBotData: BotData =
{
    messagesAllowed: true,
    currentIPv6: ""
}

/* Returns a fresh object of the data, updateBotData() must be used to persist updates*/
export function getBotData(): BotData {
    if (botData === null) {
        // assume same directory        
        let filename = path.join(__dirname, BOT_DATA);
        let fileData = null;

        try {
            fileData = fs.readFileSync(filename, 'utf8');
        } catch {
            // Nothing todo if file read fails, the defaults will get used.
            fileData = null;
        }
         
        if (!fileData) {
            botData = defaultBotData;
        } else {
            botData = JSON.parse(fileData) as BotData;
        }
    }

    // Spread to create new object
    return {...botData};
}

export function updateBotData(updatedData: BotData) {
    botData = {...updatedData};
    let filename = path.join(__dirname, BOT_DATA);
    fs.writeFile(filename, JSON.stringify(botData), (err: any) => {
        if(err) {
            console.log("File write error");
        }
    })
}