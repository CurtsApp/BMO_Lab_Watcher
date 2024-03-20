import { Api, Bot, Context, RawApi } from "grammy";
import { getBMOToken } from "./FileUtil";

type BotType = Bot<Context, Api<RawApi>>;

// new bot types can be added here
let bmo: BotType | null = null;

export function getBMO(): BotType {
    if(bmo === null) {
        bmo = new Bot(getBMOToken());
    }

    return bmo;
}