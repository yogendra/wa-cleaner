var chats = await fetchChats();
console.log("Clear Private Chats")

for ( var idx in chats.private) {
  var c = chats.private[idx];
  await c.clearMessages();
  console.log("Cleared: " + c.printable);
}

console.log("Clear Group Chats")

for ( var idx in chats.group) {
  var c = chats.group[idx];
  await c.clearMessages();
  console.log("Cleared: " + c.printable);
}

