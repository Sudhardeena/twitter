const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

let db = null
const intializeDBAndServer = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, 'twitterClone.db'),
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

intializeDBAndServer()

app.get('/user/', async (req, res) => {
  const query = `SELECT * FROM user`
  const dbResponse = await db.all(query)
  res.send(dbResponse)
})
// {
//   "username": "adam_richard",
//   "password": "richard_567",
//   "name": "Adam Richard",
//   "gender": "male"
// }
app.post('/register/', async (req, res) => {
  const {username, password, name, gender} = req.body
  const getUserQuery = `SELECT * FROM user WHERE username='${username}'`
  const selectedUser = await db.get(getUserQuery)
  console.log(selectedUser)
  if (selectedUser !== undefined) {
    res.status(400)
    res.send('User already exists')
  } else {
    if (password.length < 6) {
      res.status(400)
      res.send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const registerUserQuery = `INSERT INTO user
      (name,username,password,gender)
      VALUES ('${name}','${username}','${hashedPassword}','${gender}')`
      await db.run(registerUserQuery)
      res.status(200)
      res.send('User created successfully')
    }
  }
})

app.post('/login/', async (req, res) => {
  const {username, password} = req.body
  const getUserQuery = `SELECT * FROM user WHERE username='${username}'`
  const selectedUser = await db.get(getUserQuery)
  if (selectedUser === undefined) {
    res.status(400)
    res.send('Invalid user')
  } else {
    const isMatchedPassword = await bcrypt.compare(
      password,
      selectedUser.password,
    )
    if (isMatchedPassword === false) {
      res.status(400)
      res.send('Invalid password')
    } else if (isMatchedPassword === true) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'SECRET_KEY')
      res.send({jwtToken})
    }
  }
})

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        console.log(payload)
        request.user_id = payload.user_id
        request.name = payload.name
        request.username = payload.username
        request.password = payload.password
        request.gender = payload.gender
        next()
      }
    })
  }
}

app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {user_id} = request
  console.log(user_id)
  // console.log('hai')
  // const {user_id} = req
  // const query = `SELECT * FROM tweet
  // WHERE user_id in (SELECT following_user_id from follower WHERE follower_user_id=${user_id})
  // ORDER BY tweet_id LIMIT 4`
  // const dbResponse = await db.all(query)
  // res.send(dbResponse)
})

module.exports = app
