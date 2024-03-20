import { getCloudflareToken, getCloudflareZone } from "./FileUtil";

const cloudflareToken = getCloudflareToken();
const zone = getCloudflareZone();

interface updateResponse {
    success: boolean;
}

export function updateDNSRecords(newIPv6: string) {
    // https://developers.cloudflare.com/api/operations/dns-records-for-a-zone-update-dns-record

    return new Promise((resolve, reject) => {
        getAllZoneRecords().then(records => {
            let updateRequests: Promise<void>[] = [];

            records.forEach(record => {
                let url = `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records/${record.id}`;

                let body = {
                    content: newIPv6,
                    name: record.name,
                    type: record.type,
                };

                let options = {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudflareToken}` },
                    body: JSON.stringify(body)
                };

                updateRequests.push(fetch(url, options)
                    .then(res => res.json())
                    .then(json => {
                        let response = json as updateResponse;
                        console.log(response);
                        if(response.success) {
                            resolve(true);
                        } else {
                            reject(response);
                        }
                    })
                    .catch(err => console.error('error:' + err)));
            });

            Promise.all(updateRequests).then(res => resolve(res)).catch(err => reject(err));
        })
    });

}

// There are more properties but these are the only ones we care about for now
interface DNSRecord {
    id: string,
    name: string,
    type: string,
    content: string,
    ttl: number
}

// There are more props, these are all I care about
interface RecordResponse {
    success: boolean,
    result: DNSRecord[]
}

export function getAllZoneRecords(): Promise<DNSRecord[]> {

    const options = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloudflareToken}` }
    };

    return new Promise<DNSRecord[]>((resolve, reject) => {
        fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/dns_records?type=AAAA`, options)
            .then(response => response.json())
            .then(response => {
                let res = response as RecordResponse;
                if (res.success) {
                    resolve(res.result);
                } else {
                    reject(response);
                }
            })
            .catch(err => reject(err));
    })

}