import express from 'express';
import cors from 'cors';

const app = express();
const port = 6000;

app.use(cors());
app.use(express.json());

// Sample campaigns data
const campaigns = [
  {
    id: 1,
    title: "Help Local Food Bank",
    goal: 10000,
    raised: 7500,
    description: "Support our local food bank to provide meals for families in need"
  },
  {
    id: 2,
    title: "School Supplies Drive",
    goal: 5000,
    raised: 3200,
    description: "Help provide school supplies for underprivileged children"
  },
  {
    id: 3,
    title: "Community Garden Project",
    goal: 8000,
    raised: 4500,
    description: "Create a community garden to promote sustainable living"
  }
];

app.get('/api/campaigns', (req, res) => {
  res.json(campaigns);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 