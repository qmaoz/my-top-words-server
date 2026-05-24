const line = '############################################################################################';

function consoleLog(...message) {
  console.log('\n' + line);
  console.log(...message);
  console.log(line + '\n');
}

function consoleError(...message) {
  console.log('\n' + line);
  console.error(...message);
  console.log(line + '\n');
}

module.exports = { consoleLog, consoleError };