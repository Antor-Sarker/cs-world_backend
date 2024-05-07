const express = require("express");
const dotenv = require("dotenv");
const router = express.Router();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config({ path: "./.env" });
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.irwbbs1.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    //DB
    const database = await client.db("csworld_db");
    const videos = await database.collection("videos");
    const users = await database.collection("users");

    //get All Videos data
    router.get("/videos", async (req, res) => {
      const videosData = await videos.find().toArray();
      res.send(videosData);
    });

    //get specific video by id
    router.get("/video/:id", async (req, res) => {
      const query = { id: req.params.id };
      const video = await videos.findOne(query);
      res.send(video);
    });

    //search videos by title
    router.get("/search", async (req, res) => {
      const videosData = await videos.find().toArray();
      const keyword = req.query.q;
      const result = videosData.filter((item) =>
        item.title.toUpperCase().includes(keyword.toUpperCase())
      );
      res.send(result);
    });

    //Sort videos
    router.get("/sort", async (req, res) => {
      const videosData = await videos.find().toArray();
      const by = req.query.by;

      if (by === "popular") {
        const sorted = videosData.sort((a, b) => b.viewCount - a.viewCount);
        res.send(sorted);
      } else if (by === "latest") {
        const latest = videosData.sort(
          (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
        );
        res.send(videosData);
      } else if (by === "oldest") {
        const oldest = videosData.sort(
          (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)
        );
        res.send(oldest);
      }

      //ALL
      else {
        res.send(videosData);
      }
    });

    //Filter videos by tag name
    router.get("/tag", async (req, res) => {
      const videosData = await videos.find().toArray();
      const name = req.query.name;
      const result = videosData.filter((video) => {
        return video.tags.find((item) => item == name);
      });
      res.send(result);
    });

    //use register
    router.post("/register", async (req, res) => {
      const data = {
        ...req.body,
        avatar: null,
        historyId: [],
        savedId: [],
        token: {},
      };
      const result = await users.insertOne(data);

      res.send(result);
    });
    //login
    router.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const allUser = await users.find().toArray();

      const isLogin = await allUser.find(
        (user) => user.email === email && password === user.password
      );
      if (isLogin) {
        const {
          _id,
          firstName,
          lastName,
          email,
          avatar,
          savedId,
          favouriteId,
          historyId,
          token,
        } = isLogin;

        res.send({
          id: isLogin._id.toString(),
          firstName,
          lastName,
          email,
          avatar,
          savedId,
          favouriteId,
          historyId,
          token,
        });
      } else {
        res.send({ status: false });
      }
    });

    //viewCount
    router.post("/viewCount", async (req, res) => {
      const { videoId, logedInUser } = req.body;
      const video = await videos.findOne({ id: videoId });
      const videoFilter = { id: videoId };
      const VideoOptions = { upsert: true };
      const updateVideo = {
        $set: {
          viewCount: video.viewCount + 1,
        },
      };

      if (logedInUser) {
        //update HistoryID
        const user = await users.findOne({ _id: new ObjectId(logedInUser.id) });

        const userFilter = { _id: new ObjectId(logedInUser.id) };
        const options = { upsert: true };

        const exist = user.historyId.find((item) => item === videoId);
        const historyId = !exist
          ? [videoId, ...user.historyId]
          : [...user.historyId];

        if (!exist) {
          const result = await videos.updateOne(
            videoFilter,
            updateVideo,
            VideoOptions
          );
        }

        const updateUser = {
          $set: {
            historyId,
          },
        };

        const updateResult = await users.updateOne(
          userFilter,
          updateUser,
          options
        );

        res.send({ update: true });
      } else {
        const result = await videos.updateOne(
          videoFilter,
          updateVideo,
          VideoOptions
        );
        res.send(result);
      }
    });

    //toggle favourite
    router.patch("/favourite", async (req, res) => {
      const { isFavourite, userId, videoId } = req.body;

      const video = await videos.findOne({ id: videoId });
      const videoFilter = { id: videoId };
      const VideoOptions = { upsert: true };

      //remove from favourite
      if (isFavourite) {
        const afterRemove = video.favouriteUser.filter(
          (item) => item !== userId
        );
        const updateVideo = {
          $set: {
            favouriteUser: [...afterRemove],
          },
        };

        const result = await videos.updateOne(
          videoFilter,
          updateVideo,
          VideoOptions
        );
        res.send(result);
      }

      //add to favourite
      else {
        const updateVideo = {
          $set: {
            favouriteUser: [userId, ...video.favouriteUser],
          },
        };

        const result = await videos.updateOne(
          videoFilter,
          updateVideo,
          VideoOptions
        );
        res.send(result);
      }
    });

    //get Favourite Data
    router.get("/favourite/:authId", async (req, res) => {
      const { authId } = req.params;

      const videosData = await videos.find().toArray();

      const result = videosData.filter((video) => {
        const result = video.favouriteUser.find((userId) => userId === authId);
        if (result) return true;
        else return false;
      });
      res.send(result);
    });

    //get History
    router.get("/history", async (req, res) => {
      const { id } = req.query;
      const user = await users.findOne({ _id: new ObjectId(id) });

      const { historyId } = user;
      const videosData = await videos.find().toArray();

      const historyVideos = videosData.filter((video) => {
        const exist = historyId.find((item) => item === video.id);
        if (exist) return true;
        else return false;
      });
      historyVideos.reverse();
      res.send(historyVideos);
    });

    //delete from history
    router.delete("/history", async (req, res) => {
      const { userId, videoId } = req.body;
      const user = await users.findOne({ _id: new ObjectId(userId) });

      const historyId = user.historyId.filter((item) => item !== videoId);

      const userFilter = { _id: new ObjectId(userId) };
      const options = { upsert: true };
      const updateUser = {
        $set: {
          historyId,
        },
      };
      const updateResult = await users.updateOne(
        userFilter,
        updateUser,
        options
      );

      res.send(updateResult);
    });

    //add comment
    router.post("/comment", async (req, res) => {
      const { videoId } = req.query;

      const video = await videos.findOne({ id: videoId });
      const videoFilter = { id: videoId };
      const VideoOptions = { upsert: true };
      const updateVideo = {
        $set: {
          comments: [req.body, ...video.comments],
        },
      };

      const result = await videos.updateOne(
        videoFilter,
        updateVideo,
        VideoOptions
      );
      res.send(result);
    });

    //delete comment
    router.delete("/comment", async (req, res) => {
      const { videoId, commentId } = req.body;
      console.log(req.body);

      const video = await videos.findOne({ id: videoId });
      const videoFilter = { id: videoId };
      const VideoOptions = { upsert: true };
      const afterDelete = video.comments.filter(
        (comment) => comment.commentId !== commentId
      );
      const updateVideo = {
        $set: {
          comments: [...afterDelete],
        },
      };

      const result = await videos.updateOne(
        videoFilter,
        updateVideo,
        VideoOptions
      );
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

module.exports = router;
