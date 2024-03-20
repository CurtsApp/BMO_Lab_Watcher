const { exec } = require("node:child_process");
import { alertCurt } from "./AlertUtil";
import { updateDNSRecords } from "./CloudflareUtils";
import { getBotData, updateBotData } from "./FileUtil";
import { IS_DEV_MODE } from "./ModeUtils";

export function checkIPv6Validity() {

    return getCurrentIPv6().then(ipv6 => {
        let botData = getBotData();

        // Do nothing when ipv6 is unchanged
        if (ipv6 !== botData.currentIPv6) {
            updateDNSRecords(ipv6).then(() => {
                botData.currentIPv6 = ipv6;
                updateBotData(botData);
                alertCurt(`IPv6 updated to ${ipv6}`);
            }).catch(() => {
                alertCurt(`Failed to update IPv6 to ${ipv6}.\nRecords may be left in broken state.`);
            });            
        } else {
            // No need for alerts all the time, nice for testing though
            //alertCurt("IPv6 unchanged.");
        }
    });

}

// https://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses (First answer)
const ipv6RegEx = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/g;
function getCurrentIPv6() {
    return new Promise<string>((resolve, reject) => {
        let command = IS_DEV_MODE ? "ipconfig" : "ifconfig";
        exec(command, (err: any, stdout: any, stderr: any) => {
            if (err) {
                console.log("ifconfig error");
                console.log(err);
                reject(err);
                return;
            }

            if (stderr) {
                console.log("ifconfig stderror");
                console.log(stderr);
                reject(stderr);
                return;
            }

            // Parse command output
            let commandOut: string = stdout;
            let ipv6Addresses = commandOut.match(ipv6RegEx);
            let validIPv6 = "";
            ipv6Addresses?.forEach(address => {
                // find first address with a global prefix
                if (validIPv6 === "" && (address.at(0) === '2' || address.at(0) === '3')) {
                    validIPv6 = address.toString();                
                }
            });

            resolve(validIPv6 as string)
        })
    });
}