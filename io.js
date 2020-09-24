const fs = require('fs');
const readline = require('readline');

module.exports= {
  fileToString: function (filePath) {
    const buffer = fs.readFileSync(filePath);
    return buffer.toString();
  },

  getLinesFromFile: async function (fileName) {
    const fileStream = fs.createReadStream(fileName);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    let lines = [];
    for await (const line of rl) {
      // Each line in input.txt will be successively available here as `line`.
      // console.log(`Line from file: ${line}`);
      lines.push(line);
    }
    return lines;
  },

  writeLinesInFile: function (lines, fileName) { 
    var file = fs.createWriteStream(fileName);
    file.on('error', function(err) { /* error handling */ });
    lines.forEach(function(line) { file.write(line + '\n'); });
    file.end();
  },

  writeJsonInFile: function (json, fileName) { 
    var file = fs.createWriteStream(fileName);
    file.on('error', function(err) { /* error handling */ });
    file.write(json);
    file.end();
  }
}
