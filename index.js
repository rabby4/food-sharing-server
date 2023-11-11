const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const port = 5000


app.use(express.json())
app.use(cors({
  origin:[
    'http://localhost:5173',
    'https://food-sharing-bc5b4.web.app',
    'https://food-sharing-bc5b4.firebaseapp.com'
],
  credentials: true
}))
app.use(cookieParser())
const logger = (req, res, next) =>{
  console.log(req.method, req.url)
  next()
}
const verifyToken = (req, res, next)=>{
  const token = req?.cookies?.token
  console.log('cookies from the middleware', token)
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded)=>{
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v07t2jx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodCollections = client.db('foodShare').collection('foods')
    const requestFoodCollections = client.db('foodShare').collection('request')

    // auth related api
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      console.log('user for token', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {expiresIn: '5h'})
      res.cookie('token', token,{
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      }).send({success: true})
    })

    // app.post('/logout', async(req, res)=>{
    //   const user = req.body;
    //   console.log('logged out ', user)
    //   res.clearCookie('token',{
    //     secure: process.env.ACCESS_TOKEN === "production" ? true: false,
    //     sameSite: process.env.ACCESS_TOKEN === "production" ? "none" : "strict",})
    //     .send({success: true})
    // })
    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res
          .clearCookie('token', { maxAge: 0, sameSite: 'none', secure: true })
          .send({ success: true })
   })

    // post a food on database
    app.post('/foods', async(req, res)=>{
      const newFood = req.body;
      const result = await foodCollections.insertOne(newFood)
      res.send(result)
    })

    app.get('/foods', async(req, res)=>{
      console.log('token owner', req.user)
      // if(req.user.email !== req.query.email){
      //   return res.status(403).send({message: 'forbidden access'})
      // }
      let query = {}
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await foodCollections.find(query).toArray()
      res.send(result)
    })

    // get all foods
    app.get('/foods', async(req, res)=>{
      const query = foodCollections.find()
      const result = await query.toArray()
      res.send(result)
    })

    // get single food
    app.get('/foods/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await foodCollections.findOne(query)
      res.send(result)
    })

    // update food
    app.put('/foods/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = { upsert: true };
      const updateFood = req.body;
      const food = {
        $set: {
          foodTitle: updateFood.foodTitle,
          foodImg: updateFood.foodImg,
          quantity: updateFood.quantity,
          expDate: updateFood.expDate,
          location: updateFood.location,
          notes: updateFood.notes
        }
      }
      const result = await foodCollections.updateOne(filter, food, options)
      res.send(result)
    })

   //delete managed food
   app.delete('/foods/:id', async(req, res)=>{
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result = await foodCollections.deleteOne(query)
    res.send(result)
  })

    // post for request
    app.post('/request', async(req, res)=>{
      const newRequest = req.body;
      const result = await requestFoodCollections.insertOne(newRequest)
      res.send(result)
    })

    app.get('/request', logger, verifyToken, async(req, res)=>{
      let query = {}
      if(req.query?.email){
        query = {donorEmail: req.query.email}
      }
      const result = await requestFoodCollections.find(query).toArray()
      res.send(result)
    })

    app.patch('/request/:id', async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updatedFood = req.body
      console.log(updatedFood)
      const updateDoc = {
        $set: {
          status: updatedFood.status
        },
      };
      const result = await requestFoodCollections.updateOne(filter, updateDoc)
      res.send(result)
    })

    // delete requested food
    app.delete('/request/:id', async(req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await requestFoodCollections.deleteOne(query)
      res.send(result)
    })
    
    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Community food sharing server is running!')
})

app.listen(port, () => {
  console.log(`Food sharing app listening on port ${port}`)
})