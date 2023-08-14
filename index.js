const express = require('express');
const app = express();
const mongdb = require('./src/config/mongodb/index');
const methodOverride = require('method-override');
const path = require('path');
const route = require('./src/route/index.route');
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const cookieParser = require('cookie-parser');
const SocketService = require('./src/services/chat.service')


global._io = io;

app.use(express.static(path.join(__dirname, 'src','public')));
mongdb.connect();
app.use(methodOverride('_method'));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(express.urlencoded({
    extended: true
  }));
app.use(express.json());

app.set('views', path.join(__dirname, 'src', 'views'));


_io.on('connection', SocketService.connection)


const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, res) => {
    res(null, './src/public/image')
  },
  filename: (req, file, res) => {
    res(null, file.fieldname + '_' + Date.now() + path.extname(file.originalname))
  }
})
const upload = multer({ storage: storage });

app.post('/uploads', upload.single('image'), async (req, res) => {
  res.json({
    url: req.file.filename
  });
})

route(app);


server.listen(3000, () => {
  console.log('Máy chủ đã khởi động tại http://localhost:3000/');
});
