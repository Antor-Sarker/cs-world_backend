const express = require('express');
const router = require('../routes/routes');
const app = express()
const cors=require('cors')

const port = 3500

app.use(cors())
app.use(express.json())

app.use('/', router)
app.get('/',(req,res)=>{
    res.send('home')
})
app.listen(port,()=>{
    console.log(`app listening on port ${port}`)
})