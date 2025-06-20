import { alertCurt, setAllowMessage } from "./AlertUtil";
import { getBMO } from "./BotManager";
import { checkIPValidity, checkServiceReachability, setAutoRebootOnFailedServiceCheck } from "./HealthCommand";

//Create a new bot
const bot = getBMO();

const commands: {
  name: string,
  description: string,
  handler: () => void
}[] = [
    {
      name: "mute",
      description: "stop sending ALL messages",
      handler: () => setAllowMessage(false)
    },
    {
      name: "unmute",
      description: "allow messages to be sent",
      handler: () => setAllowMessage(true)
    },
    {
      name: "test",
      description: "send test message",
      handler: () => alertCurt("test")
    },
    {
      name: "checkIPv4",
      description: "validate IPv4 is correct, update it when it isn't",
      handler: () => checkIPValidity(false)
    },
    // BMO's current location doesn't have IPv6 access
    // {
    //   name: "checkIPv6",
    //   description: "validate IPv6 is correct, update it when it isn't",
    //   handler: () => checkIPv6Validity()
    // },
    {
      name: "allowAutoReboot",
      description: "allows BMO to reboot the server if the service check fails",
      handler: () => setAutoRebootOnFailedServiceCheck(true)
    },
    {
      name: "disableAutoReboot",
      description: "dis-allows BMO from rebooting the server if the service check fails",
      handler: () => setAutoRebootOnFailedServiceCheck(false)
    },
    {
      name: "checkServicesUp",
      description: "check that all services are online, reboot if not",
      handler: () => checkServiceReachability(true)
    }
  ];

function setupCommands() {
  // Setup menu first
  let menu = "<b>BMO Commands</b>\n";
  commands.forEach(command => {
    menu = menu.concat(`\n<b>/${command.name}</b> - ${command.description}`)
  });
  bot.command("menu", async (ctx) => {
    await ctx.reply(menu, {
      parse_mode: "HTML",
    });
  });

  // Setup rest of commands
  commands.forEach(command => {
    bot.command(command.name, command.handler);
  })
}

//Start the Bot
setupCommands();
bot.start();
alertCurt("BMO Awaiting your command!");

// Monitor for address changes
let checkCounter = 0;
setInterval(() => {
  if(checkCounter % 5 === 4) {
    // Operation every 5 minutes
    // Monitor for service outage
    checkServiceReachability(false);
  } else {
    // Every minute except when checking service availability
    checkIPValidity(false);

    // BMO's no location does not have IPv6 access
    // checkIPv6Validity();
  }
  checkCounter = ( checkCounter + 1 ) % 5;
}, 1 * 1000 * 60 ); // Operation every minute

// Let me know if something would have crashed
bot.catch((e) => {
  alertCurt("I encountered something I can't handle.")
  console.log(e.error);
});

