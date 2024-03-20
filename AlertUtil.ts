import { getBMO } from "./BotManager";
import { getBotData, updateBotData } from "./FileUtil";

//Create a new bot
const bot = getBMO();
const myUserID = 5927558826;

let allowMessages = getBotData().messagesAllowed;

export function alertCurt(msg: string, forceSend = false) {
    if(allowMessages || forceSend) {
        bot.api.sendMessage(myUserID, msg);
    }    
}

export function setAllowMessage(allowed: boolean) {
    // Updated local state
    allowMessages = allowed;

    // Save state for persistance
    let botData = getBotData();
    botData.messagesAllowed = allowed;
    updateBotData(botData);
  }