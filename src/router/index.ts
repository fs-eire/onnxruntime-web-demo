import { createRouter, createWebHashHistory } from "vue-router";

import Home from "../components/Home.vue";
import EmotionRecognition from "../components/models/Emotion.vue";
import MNIST from "../components/models/MNIST.vue";
import MobileNet from "../components/models/Mobilenet.vue";
import SqueezeNet from "../components/models/Squeezenet.vue";
import YoLo from "../components/models/Yolo.vue";
import whisper from "../components/models/whisper.vue";

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/mobilenet',
    name: 'mobilenet',
    component: MobileNet,
  },
  {
    path: '/squeezenet',
    name: 'squeezenet',
    component: SqueezeNet,
  },
  {
    path: '/MNIST',
    name: 'MNIST',
    component: MNIST,
  },
  {
    path: '/YoLo',
    name: 'YoLo',
    component: YoLo,
  },
  {
    path: '/emotion',
    name: 'EmotionRecognition',
    component: EmotionRecognition,
  },
  {
    path: '/whisper',
    name: 'whisper',
    component: whisper,
  },
  // {
  //   path: '/:pathMatch(.*)*',
  //   redirect: "/"
  // },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
