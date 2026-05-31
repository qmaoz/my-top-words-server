const line = '############################################################################################';

function consoleLog(...message) {
  console.log();
  console.log(...message);
  console.log('\n' + line);
}

function consoleError(...message) {
  console.log();
  console.error(...message);
  console.log('\n' + line);
}

module.exports = { consoleLog, consoleError };