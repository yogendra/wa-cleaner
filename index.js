const path = require('node:path');
const os = require('os');
const { program } = require('commander');
const { Chat, Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const repl = require('node:repl');
const util = require('node:util');
var fs = require('node:fs');

util.inspect.defaultOptions.maxArrayLength = null;

program
  .option('-p, --profile <profile>', 'Profile to use for running cleaner', 'default')
  .parse(process.argv);
opts = program.opts();
const userConfigDir = process.env.XDG_CONFIG_HOME || `${require('os').homedir()}/.config`;
const appConfigDir = path.join(userConfigDir,  "wa-cleaner");
const profileDir = path.join(appConfigDir, opts.profile);
const replHistoryFile = path.join(profileDir, 'repl_history');
fs.mkdirSync(appConfigDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });

console.log(`
Application Config : ${appConfigDir},
Profile Name       : ${opts.profile}
Profile Directory  : ${profileDir}
REPL History File  : ${replHistoryFile}
`);


const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: profileDir
    })
});


// When the client is ready, run this code (only once)
client.once('ready', async () => {
  console.log('Connected to Whatsapp');
  console.log('Preparing REPL env');

  let replOption = {
    prompt : `${client.info.pushname} (${client.info.me._serialized})
> `,
    useColors: true,
    writer: util.inspect
  };

  const r = repl.start(replOption);

  Object.defineProperty(r.context, 'client', {
    configurable: false,
    enumerable: true,
    value: client,
  });
  Object.defineProperty(r.context, 'fetchChats', {
    configurable: false,
    enumerable: true,
    value: fetchChats,
  });

  Object.defineProperty(r.context, 'sleep', {
    configurable: false,
    enumerable: true,
    value: sleep,
  });

  r.setupHistory(replHistoryFile, function(e, repl){
    if( e !== null){
      console.error(`REPL.History : ${e.name}: ${e.message}`);
    }
  });

  r.defineCommand("init", {
    help: "Init/Reinit context, attach client, fetch chats, etc.",
    action() {
      refreshContext(r.context);
    }
  })

  r.on('exit', () => {
    client.destroy();
    console.log('Bye');
    process.exit();
  });
});


// When the client received QR-Code
client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  qrcode.generate(qr, {small: true});

});
async function refreshContext(context){
  let all = await fetchChats();
  let chats = {
    all : all,
    group : [],
    private : [],
    other : []
  }
  all.forEach(chat => {
    let type = chat.constructor.name;
    switch(type){
      case "GroupChat":
        chats.group.push(chat);
        break;
      case "PrivateChat":
        chats.private.push(chat);
        break;
      default:
        chats.other.push(chat);
    }
  });
  Object.defineProperty(context, 'chats', {
    configurable: false,
    enumerable: true,
    value: chats,
    writable: true
  });

  console.log('Chats fetched and stored at `chats` variable');


}
// Start your client
console.log("Establish connection to Whatsapp")
client.initialize();

/**
 * Format each chat as pretty
 * @param {Chat} chat
 * @returns
 */
async function prettyFormatChat(chat){
  let t = chat.isGroup ? "G" : "P";
  let a = chat.archived ? "A" : "-";
  let m = chat.isMuted ? "M" : "-";
  let r = chat.isReadOnly? "R": "-";
  let p = chat.pinned? "P": "-";
  let id = chat.id._serialized.padEnd(40, ' ');
  let nm = chat.name ? chat.name.padEnd(100, ' ') : `ID: ${chat.id._serialized}`.padEnd(100,' ');
  let lbs = chat.labels.join(',');
  let ts = chat.timestamp === undefined? "".padStart("24", "-"): new Date(chat.timestamp * 1000).toISOString();

  return `${ts} [${t}${a}${m}${r}${p}] ${id} ${nm} [Labels: ${lbs}]`;
}
async function fetchChats() {
  let chats = await client.getChats();

  let populateChats = chats.map(async function (chat) {
    let labels = (await chat.getLabels()).map(l => l.name);
    let contact = await chat.getContact();

    Object.defineProperty(chat, "labels", {
      configurable: false,
      enumerable: true,
      value: labels,
    });
    Object.defineProperty(chat, "contact", {
      configurable: false,
      enumerable: true,
      value: contact,
    });

    let printable = await prettyFormatChat(chat);
    Object.defineProperty(chat, 'printable', {
      configurable: false,
      enumerable: true,
      value: printable,
    })
    return chat;
  });

  return await Promise.all(populateChats);
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
