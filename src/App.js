import './App.css'
import React, { useEffect, useRef, useState } from 'react'
import { Howl } from 'howler'
import { initNotifications, notify } from '@mycv/f8-notification'
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import * as tfjs from '@tensorflow/tfjs'
import soundURL from './assets/hey_sondn.mp3'

var sound = new Howl({
  src: [soundURL]
})

function App() {
  const video = useRef()
  const classifier = useRef()
  const mobilenetModule = useRef()
  const canPlayAudio = useRef(true)
  const NOT_TOUCH_LABEL = 'not touch'
  const TOUCHED_LABEL= 'touched'
  const TRAINING_TIMES = 100
  const TOUCHED_CONFIDENCE = 0.8
  const [touched, setTouched] = useState(false)

  const init = async () => {
    console.log('init...')
    await setupCamera()
    console.log('setup camera successfully')

    mobilenetModule.current = await mobilenet.load();
  
    classifier.current = knnClassifier.create()

    console.log('setup done')
    console.log('Không chạm tay lên mặt và bấm Train 1')
    initNotifications({ cooldown: 3000 })
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
      
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true }, 
          stream => {
            video.current.srcObject = stream
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
        )
      }
    })
  }

  const train = async label => {
    console.log(`[${label}] Đang train cho máy`)
    for (let i = 0; i < TRAINING_TIMES; i++)
    {
      console.log(`Progress ${parseInt((i+1) / TRAINING_TIMES * 100)}%`)

      await training(label)
    }
  }

  const training = async label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      )
      classifier.current.addExample(embedding, label)
      await sleep(200);
      resolve();
    })
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    )
    const result = await classifier.current.predictClass(embedding)
    
    if (result.label === TOUCHED_LABEL && result.confidences[result.label] > TOUCHED_CONFIDENCE)
    {
      console.log('Touched')
      if (canPlayAudio.current) 
      {
        canPlayAudio.current = false
        sound.play()
      }
      notify('Put your hands down', { body: "You've touched your face!"})
      setTouched(true)
    }
    else 
    {
      console.log('Not touched')
      setTouched(false)
    }
    await sleep(200)
    run()
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init()
    sound.on('end', function(){
      canPlayAudio.current = true
    });

    //cleanup
    return () => {

    }
  //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className={`App ${touched ? 'touched': ''}`}>
      <video 
        ref={video}
        className='video'
        autoPlay
      />

      <div className='control'>
        <button className='btn' onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className='btn' onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className='btn' onClick={() => run()}>Run</button>
      </div>
    </div>
  );
}

export default App;