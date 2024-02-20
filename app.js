const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'twitterClone.db')
let db = null

const instilizeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running Sucessfully')
    })
  } catch (error) {
    console.log(`Db Error :${error.message}`)
  }
}
instilizeDbAndServer()

const authonticationToken = () => {
  const {tweet} = request.body
  const {tweetId} = request.params
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'Dhanu', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.payload = payload
        request.tweetId = tweetId
        request.tweet = tweet
        next()
      }
    })
  }
}

// API 1 /register/

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const getQueryDetailes = `
  SELECT
    *
  FROM
   user
  WHERE
   username = '${username}';`

  const userDb = await db.get(getQueryDetailes)

  if (userDb !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const updatePassword = `
      INSERT INTO 
       user(username,password,name,gender)
      VALUES()
      '${username}',
      '${hashedPassword}',
      '${name}',
      '${gender}');`
      await db.run(updatePassword)
      response.status(200)
      response.send('User created successfully')
    }
  }
})

//API 2 /login/

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const getQueryDetailes = `
  SELECT
    *
  FROM
   user
  WHERE
   username = ${username};`
  console.log(username, password)
  const dbUser = await db.get(getQueryDetailes)
  console.log(dbUser)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isMatchedPassword = await bcrypt.compare(password, dbUser.password)
    if (isMatchedPassword === true) {
      const jwtToken = jwt.sign(dbUser, 'Dhanu')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//API 3 /user/tweets/feed/
app.get(
  '/user/tweets/feed/',
  authonticationToken,
  async (request, response) => {
    const {payload} = request
    const {user_id, name, username, gender} = request
    console.log(name)
    const getTweetDetailes = `
     SELECT
       username,
       tweet,
       date_time as dateTime
     FROM
      follower INNER JOIN tweet ON follower.following_user_id=tweet.user_id INNER JOIN  user ON user.user_id=follower.following_user_id
     WHERE
      follower.follower_user_id =${user_id}
    ORDER BY 
     date_time DESC
    LIMIT 4;`
    const tweetFeedArray = await db.all(getTweetDetailes)
    response.send(tweetFeedArray)
  },
)

//API 4 /user/following/

app.get('/user/following/', authonticationToken, async (request, response) => {
  const {payload} = request
  const {user_id, name, username, gender} = request
  console.log(name)
  const getUserList = `
     SELECT
      name
    FROM
      user INNER JOIN follower ON user.user_id=follower.following_user_id
    WHERE
     follower.follower_user_id = ${user_id}
     ;`
  const namesArray = await db.all(getUserList)
  response.send(namesArray)
})

//API 5 /user/followers/

app.get('/user/followers/', authonticationToken, async (request, response) => {
  const {payload} = request
  const {user_id, name, username, gender} = request.payload
  console.log(name)

  const getAllFollowers = `
     SELECT
      name
     FROM
      user INNER JOIN follower ON user.user_id=follower.follower_user_id 
     WHERE
      follower.following_user_id = ${user_id};`
  const followersList = await db.all(getAllFollowers)
  response.send(followersList)
})

//API 6 /tweets/:tweetId/
app.get("/tweets/:tweetId/",authonticationToken, async (request,response){

const {tweetId} = request
const {payload} = request
const {user_id, name, username, gender} = request
console.log(name,tweetId)

const queryDetailes = 
`
SELECT
  *
FROM
 tweet
WHERE
 tweet_id = ${tweetId};`
const tweetDb = await db.get(queryDetailes);

const userFollowingDetailes = 
`SELECT
   *
 FROM
  follower INNER JOIN user on follower.following_user_id=user.user_id
WHERE
 follower.follower_user_id=${user_id};`

const followingDb = await db.all(userFollowingDetailes)

if (followingDb.some((item)=>{
  item.following_user_id === tweetDb.user_id
})){
  console.log(tweetDb)
  console.log("------------")
  console.log(followingDb)
  const getUserRequests=
  `Select
    tweet,
    COUNT(DISTINCT(like.like_id) as likes,
    COUNT(DISTINCT(reply.reply_id) as replies,
    tweet.date_time as dateTime
  FROM
   tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id INNER JOIN reply ON reply.tweet_id = tweet.tweet_id
  WHERE
   tweet.tweet_id = ${tweetId} AND tweet.user_id=${followingDb[0].user_id};`
   const tweetDetailesDb = await db.get(getUserRequests)
   response.send(tweetDetailesDb)
}
else{
  response.status(401)
  response.send("Invalid Request")
}

});


//API 7/tweets/:tweetId/likes/
app.get("/tweets/:tweetId/likes/",authonticationToken,async (request,response)=>{
const {tweetId} = request
const {payload} = request
const {user_id, name, username, gender} = request
console.log(name,tweetId)
const getUsersLikes = ` 
SELECT
 * 
FROM 
 follower INNER JOIN tweet follower.following_user_id = tweet.user_id INNER JOIN like ON like.tweet_id = tweet.tweet_id INNER JOIN user ON user.user_id = like.user_id 
WHERE 
 tweet.tweet_id = ${tweetId} AND follower.follower_user_id = ${user_id};`
const likedUsers = await db.all(getUsersLikes)
console.log(likedUsers)
if (likedUsers.length!==0){
  let likes = []
  const getNamesArray = (likedUsers)=>{
    for (let item of likedUsers){
    likes.push(item.userName)
  }
  } 
  getNamesArray(likedUsers)
  response.send({likes})
}else {
  response.status(401)
  response.send("Invalid Request")
}

});

// API 8 /tweets/:tweetId/replies/

app.get("/tweets/:tweetId/replies/",authonticationToken,async (request,response)=>{
const {tweetId} = request
const {payload} = request
const {user_id, name, username, gender} = request
console.log(name,tweetId)
const getUsersReplies = ` 
SELECT
 * 
FROM 
 follower INNER JOIN tweet follower.following_user_id = tweet.user_id INNER JOIN reply ON reply.tweet_id = tweet.tweet_id INNER JOIN user ON user.user_id = reply.user_id 
WHERE 
 tweet.tweet_id = ${tweetId} AND follower.follower_user_id = ${user_id};`
const repliesDb = await db.all(getUsersReplies)
console.log(getUsersReplies)
if (repliesDb.length!==0){
  let replies = []
  const getrepliesArray = (repliesDb)=>{
    for (let item of repliesDb){
    let myObject = {
      name:item.name,
      reply:item.reply,

    }
    replies.push(myObject)
  }
  } 
  getrepliesArray(repliesDb)
  response.send({replies})
}else {
  response.status(401)
  response.send("Invalid Request")
}

});

// API 9 /user/tweets/

app.get("/user/tweets/",authonticationToken,async (request,response)=>{
const {payload} = request
const {user_id, name, username, gender} = request
console.log(name,user_id)

const getTweetDetailes = `
SELECT
  tweet,
  COUNT(DISTINCT(like.like_id)) as likes,
  COUNT(DISTINCT(reply.reply_id)) as replies,
  tweet.date_time as dateTime
 From
  user INNER JOIN tweet ON user.user_id = tweet.user_id INNER JOIN like ON like.tweet_id = tweet.tweet_id INNER JOIN reply ON reply.tweet_id=tweet.tweet_id
 WHERE
  user.user_id = ${user_id}
 GROUP BY
  tweet.tweet_id;`

const tweetDetailes = await db.all(getTweetDetailes)
response.send(tweetDetailes)
});

//API 10 /user/tweets/

app.post("/user/tweets/",authonticationToken, async (request,response){
  const {tweet} = request
  const {tweetId} = tweetId
  const {payload} = request
  const {user_id, name, username, gender} = payload
  console.log(name,user_id)
  const postTweetQuery =
  `INSER INTO 
    tweet(tweet,user_id)
   VALUES(
    '${tweet}',
    '${user_id}');`

    await db.run(postTweetQuery)
    response.send("Created a Tweet")
});

app.delete("/tweets/:tweetId/",authonticationToken, async (request,response)=>{
  const {tweetId} = tweetId
  const {payload} = request
  const {user_id, name, username, gender} = payload
  const selectUserQuery = `
  SELECT
   *
  FROM
   tweet
  WHERE
   tweet.user_id = ${user_id} AND tweet.tweet_id = ${tweetId};`
  const tweetUser = await db.all(selectUserQuery)

  if (tweetUser.length !==0){
    const deleteQuery = 
    `
    DELETE FROM 
     tweet
    WHERE
    tweet.user_id = ${user_id} AND tweet.tweet_id = ${tweetId};`
    await db.run(deleteQuery)
    response.send("Tweet Removed")
  }
  else {
  response.status(401)
  response.send("Invalid Request")
}
})

module.exports = app
