const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const dbPath = path.join(__dirname, 'moviesData.db')
const app = express()
app.use(express.json())
let db = null
const intilizeDbAndServer = async () => {
  try {
    await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error:${error.message}`)
    process.exit(1)
  }
}
intilizeDbAndServer()

const convertMovieDbObjectToResponseObject = dbObject => {
  return {
    movieId: dbObject.movie_id,
    directorId: dbObject.director_id,
    movieName: dbObject.movie_name,
    leadActor: dbObject.lead_actor,
  }
}

const convertDirectorDbObjectToResponseObject = dbObject => {
  return {
    directorId: dbObject.director_id,
    directorName: dbObject.director_name,
  }
}

app.get('/movies/', async (request, response) => {
  const moviesNameQuery = `
    SELECT movie_name FROM movie;`
  let movieNameArray = await db.all(moviesNameQuery)
  response.send(
    movieNameArray.map(eachMovie =>{return {movieName: eachMovie.movie_name}})
  )
});

app.get('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const movieNameQuery = `SELECT movie_name FROM movie WHERE movie_id=${movieId};`
  const movie = await db.get(movieNameQuery)
  response.send(convertMovieDbObjectToResponseObject(movie))
});

app.post("/movies/",async (request,response)=>{
  const {directorId,movieName,leadActor} = request.body
  const postMovieaDetailes = `
  INSERT INTO 
    movie (director_id,movie_name,lead_actor) 
  VALUES 
  (
  ${directorId},'${movieName}','${leadActor}');`;
  await db.run(postMovieaDetailes)
  response.send("Movie Successfully Added")
});

app.put("/movies/:movieId/",async(request,response)=>{
  const {directorId,movieName,leadActor} = request.body
  const {movieId} = request.params
  const updateQuery = `UPDATE 
                        movie 
                      SET
                        director_id = ${directorId},
                        movie_name = '${movieName}',
                        lead_actor = '${leadActor}'
                      WHERE
                        movie_id = ${movieId};`
  await db.run(updateQuery)
  response.send("Movie Details Updated")

});

app.delete("/movies/:movieId/",async(request,response)=>{
  const {movieId} = request.params
  const deleteQuery = `DELETE FROM
                        movie
                      Where
                        movie_id = ${movieId};`;
  await db.run(deleteQuery);
  response.send("Movie Removed")
});

app.get('/directors/', async (request, response) => {
  const directoreQuery = 
  `SELECT 
     * 
   FROM 
    director;`
  const directorNameArray = await db.all(directoreQuery)
  response.send(
    directorNameArray.map((eachDirector) => convertDirectorDbObjectToResponseObject(eachDirector)),
  );
});

app.get("/directors/:directorId/movies/",async(request,response) =>{
  const {directorId} = request.params;
  const movieNameQuery = `
  SELECT 
   movie.movie_name as movieName 
  FROM 
   director NATURAL JOIN movie 
  WHERE 
   director.director_id = ${directorId};`
  
  const directorMovies = await db.all(movieNameQuery)
  response.send(directorMovies)
})
module.exports =app
