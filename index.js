const express = require('express')
const app = express()

const port = 3500

app.get('/',(req,res)=>{
    res.send('hello express js');
})

app.get('/videos', (req,res)=>{
    res.send('all videos')
})

app.get('/details',(req,res)=>{
    res.send('details singel data')
})

app.listen(port,()=>{
    console.log(`app listening on port ${port}`)
})