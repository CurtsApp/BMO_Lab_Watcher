const { exec } = require("node:child_process");
import { alertCurt } from "./AlertUtil";
import { updateDNSRecords } from "./CloudflareUtils";
import { getBotData, updateBotData } from "./FileUtil";
import { IS_DEV_MODE } from "./ModeUtils";

export function checkIPValidity(isIPv6: boolean) {
    let botData = getBotData();

    return getCurrentIP(isIPv6).then(ip => {
        const currentIP = isIPv6 ? botData.currentIPv6 : botData.currentIPv4;
        // Do nothing when ip is unchanged
        if (ip !== currentIP) {
            const ipType = isIPv6 ? "IPv6" : "IPv4";
            updateDNSRecords(ip, isIPv6).then(() => {
                if(isIPv6) {
                    botData.currentIPv6 = ip;
                } else {
                    botData.currentIPv4 = ip;
                }
                
                updateBotData(botData);
                alertCurt(`${ipType} updated to ${ip}`);
            }).catch(() => {
                alertCurt(`Failed to update ${ipType} to ${ip}.\nRecords may be left in broken state.`);
            });
        } else {
            // No need for alerts all the time, nice for testing though
            //alertCurt("IPv6 unchanged.");
        }
    });
}

// https://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses (First answer)
const ipv6RegEx = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/g;
const ipv4RegEx = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/g;
function getAllGlobalIPv6s() {
    return new Promise<string[]>((resolve, reject) => {
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
            let validIPv6s: string[] = [];
            ipv6Addresses?.forEach(address => {
                // find first address with a global prefix
                if (address.at(0) === '2' || address.at(0) === '3') {
                    validIPv6s.push(address.toString());
                }
            });

            resolve(validIPv6s);
        })
    });
}

function getCurrentIP(isIPv6: boolean) {
    const options = {
        method: 'GET',
        headers: { 'Content-Type': 'application/plain' }
    };

    return new Promise<string>((resolve, reject) => {
        const address = isIPv6 ? "https://api6.ipify.org" : "https://api.ipify.org";
        fetch(address, options)
            .then(response => {
                if (response.ok) {
                    response.text().then(text => {
                        if (text) {
                            let regExMatch = isIPv6 ? ipv6RegEx : ipv4RegEx;
                             // Validate returned text was an ipv6 address
                            let ipAddresses = text.match(regExMatch);
                            if (ipAddresses?.length === 1) {
                                resolve(text);
                            } else {
                                reject();
                            }
                        } else {
                            reject();
                        }
                    })
                } else {
                    reject();
                }
            })
            .catch(err => reject(err));
    });
}

const services = [
    "https://plex.curts.app",
    "https://blog.curts.app",
    "https://mealie.curts.app",
]

let autoRebootWhenUnreachable = getBotData().autoRebootWhenUnreachable;

export function checkServiceReachability(wasManualRequest: boolean) {
    let serviceChecks: Promise<string>[] = [];

    services.forEach(service => serviceChecks.push(isServiceDown(service)));
    Promise.all(serviceChecks).then(res => {
        if (wasManualRequest) {
            alertCurt("All services online.");
        }
    }).catch(msg => {
        alertCurt(msg);
        if (autoRebootWhenUnreachable) {
            alertCurt("Restarting server, see you soon.");
            // restart
            exec(`sudo reboot`, (err: any, stdout: any, stderr: any) => {
                if (err) {
                    alertCurt("reboot error");
                    alertCurt(err.toString());
                    return;
                }

                if (stderr) {
                    alertCurt("reboot stderror");
                    alertCurt(stderr.toString());
                    return;
                }
            })
        }
    })
}


export function setAutoRebootOnFailedServiceCheck(allowed: boolean) {
    // Updated local state
    autoRebootWhenUnreachable = allowed;

    // Save state for persistance
    let botData = getBotData();
    botData.autoRebootWhenUnreachable = allowed;
    updateBotData(botData);
}

function isServiceDown(url: string) {
    let options = {
        method: 'GET'
    };
    return new Promise<string>((resolve, reject) => {
        fetch(url, options)
            .then(res => {
                // Plex has a redirect, so include 300 codes
                // Plex then returns 401 unauthorized, but that means it's up. So as long as it's not a 500 it's probably online
                if (res.status >= 200 && res.status < 500) {
                    resolve(`${url} reachable`);
                } else {
                    reject(`${url} unreachable`);
                }
            })
            .catch(err => reject(`${url} unreachable`));
    })

}