var port = process.env.PORT || 3000,
    http = require('http'),
    fs = require('fs'),
    html = fs.readFileSync('index.html');

var Redis = require('ioredis');
var redisAddress = process.env.REDIS_ENDPOINT_ADDRESS || 'localhost';
var redisPort = process.env.REDIS_ENDPOINT_PORT || '6379';
var redisUrl = `redis://${redisAddress}:${redisPort}`;
var redis = new Redis(redisUrl);

var response = {
    'time': new Date().toISOString(),
    'redis_error': 'none',
    'redis_connect': 'not connected',
    'redis_url': redisUrl,
    'redis_address': process.env.REDIS_ENDPOINT_ADDRESS,
    'redis_port': process.env.REDIS_ENDPOINT_PORT
}

redis.on('ready',() => {
    console.log("Redis server is ready ", redis.status);
    response['redis_connect'] = redis.status;
});

redis.on('error', err => {
    console.log('REDIS: FAILED', err);
    response['redis_error']  = err;
});

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
    res.end(JSON.stringify(response));
});

// Listen on port 3000, IP defaults to 127.0.0.1
server.listen(port);

// Put a friendly message on the terminal
console.log('Server running at http://127.0.0.1:' + port + '/');
