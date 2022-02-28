var port = process.env.PORT || 3000,
    http = require('http'),
    fs = require('fs'),
    html = fs.readFileSync('index.html');

var Redis = require('ioredis');
var redis_address = process.env.REDIS_ADDRESS || 'aws-bl-1pdjnxpnog61t.dekolu.0001.euc1.cache.amazonaws.com:6379'; // || 'redis://127.0.0.1:6379';
var redis = new Redis(redis_address);
var redisState = 'not set';

redis.on('ready',() => {
    console.log("Redis server is ready ", redis.status);
    redisState = redis.status;
});

redis.on('error', err => {
    console.log('REDIS: FAILED', err);
    redisState = err;
})

// var log = function(entry) {
//     fs.appendFileSync('/tmp/sample-app.log', new Date().toISOString() + ' - ' + entry + '\n');
// };

var server = http.createServer(function (req, res) {
    // if (req.method === 'POST') {
    //     var body = '';

    //     req.on('data', function(chunk) {
    //         body += chunk;
    //     });

    //     req.on('end', function() {
    //         if (req.url === '/') {
    //             console.log('Received message: ' + body);
    //         } else if (req.url = '/scheduled') {
    //             console.log('Received task ' + req.headers['x-aws-sqsd-taskname'] + ' scheduled at ' + req.headers['x-aws-sqsd-scheduled-at']);
    //         }

    //         res.writeHead(200, 'OK', {'Content-Type': 'text/plain'});
    //         res.end();
    //     });
    // } else {
    //     res.writeHead(200);
    //     res.write(html);
    //     res.end();
    // }
    const jsonContent = JSON.stringify({
        status: redis.status || 'no redis connection',
        msg: redisState
    });
    res.end(jsonContent);
});

// Listen on port 3000, IP defaults to 127.0.0.1
server.listen(port);

// Put a friendly message on the terminal
console.log('Server running at http://127.0.0.1:' + port + '/');
