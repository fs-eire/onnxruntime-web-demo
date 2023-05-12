<template>
    <!-- session Loading and Initializing Indicator -->
    <model-status
        v-show="modelLoading || modelInitializing"
        :modelLoading="modelLoading"
        :modelInitializing="modelInitializing"
        ></model-status>
    <div style="row-gap: 20px;" v-show="!modelLoading && !modelInitializing">
        <div class="userInputInterface">
            <v-layout class="audioInput">
                <h2>Audio Input</h2>
                <br>
                <div style="display: flex; flex-direction: row">
                    <label class="Btn">
                        <div style="width:auto; align-self: auto;">
                            <span>UPLOAD FILE</span>
                        </div>
                        <input :disabled="modelLoading || modelInitializing || modelLoadingError"
                            style="display: none"
                            type="file"
                            id="input-upload-audio"
                            @change="handleFileChange"
                        />
                    </label>
                    <v-layout class="text-xs-center" style="align-self: center; justify-content: center;"> or </v-layout>
                    <v-btn
                        :disabled="modelLoading || modelInitializing || modelLoadingError"
                        class="Btn"
                        @click="handleMicClick"> {{recordBtn}} </v-btn>
                </div>
            </v-layout>
            <v-layout class="transcribe">
                <h2>Transcribe</h2>
                <br>
                <div style="display: flex; flex-direction: row">
                    <div id="record_play">
                            <audio id="record_play_audio" controls></audio>
                    </div>
                    <br />
                    <v-btn 
                        
                        id="transcribeBtn" 
                        class="Btn" 
                        type="button"
                        @click="handleTranscribeClick"> {{ transcribeBtn }} </v-btn>
                </div>
            </v-layout>
            <v-layout class="stats">
                <h2>Stats</h2>
                <br>
                <v-layout v-show="latency!=0"> {{ latencyOutput }} </v-layout>
            </v-layout>
        </div>
        <!-- <div class="progress">
            <div id="progress" class="progress-bar progress-bar-striped" role="progressbar" style="width: 0%"
                aria-valuemin="0" aria-valuemax="100"></div>
        </div> -->
        <div class="transcription">
            <v-model id="outputText" class="transcription-output" readonly>{{ outputText }}</v-model>
        </div>
        <div class="log">
            <div id="status" style="font: 1em consolas;white-space: pre-line">{{ logOutput }}</div>
        </div>
    </div>
</template>
  
<script lang="ts">
  
import { Tensor, InferenceSession, env } from "onnxruntime-web";
import { defineComponent, onMounted, ref } from "vue";
import { runModelUtils } from "../../utils";
import modelStatus from "../common/ModelStatus.vue";
  
const MODEL_FILEPATH = import.meta.env.BASE_URL === '/' ? "/assets/Models/whisper_cpu_int8_0_model.onnx":"/onnxruntime-web-demo/assets/Models/whisper_cpu_int8_0_model.onnx";

export default defineComponent({
    name: "Whisper",

    components: {
        modelStatus,
    },

    props: {
        hasWebGL: {
        type: Boolean,
        required: true,
        },
    },

    setup(props, { emit }){
        let modelLoading = ref(true);
        let modelInitializing = ref(true);
        let modelLoadingError = ref(false);
        let sessionRunning = ref(false);
        let imageLoading = ref(false);
        let imageLoadingError = ref(false);
        let transcribing = ref(false);
        let recording = ref(false);

        let recordBtn = ref("Record");
        let transcribeBtn = ref("Transcribe");

        let outputText = ref("Transcription goes here");
        let logOutput = ref("");
        let latencyOutput = ref("");

        const kSampleRate = 16000;
        const kIntervalAudio_ms = 1000;
        const kSteps = kSampleRate * 30;
        const kDelay = 100;

        // ort session
        let sess : Whisper | undefined = undefined;

        // audio context
        var context: AudioContext | null = null;
        let mediaRecorder: MediaRecorder|undefined = undefined;
        let modelFile: ArrayBuffer = new ArrayBuffer(0);

        // stats
        let total_processing_time = 0;
        let total_processing_count = 0;

        // some dom shortcuts
        // let record;
        // let transcribe;
        // let progress;
        let audio_src: HTMLAudioElement|null; 

        let latency = ref(0);

        function handleFileChange(e: any) {
            emit("input", e.target.files[0]);
            audio_src!.src = URL.createObjectURL(e.target.files[0]);
        }

        onMounted(() => {
            transcribing.value = false;
            audio_src = document.querySelector('audio');
            context = new AudioContext({
                latencyHint: "interactive",
                sampleRate: kSampleRate,
            });
            logOutput.value = "";
            // progress = document.getElementById('progress');
            // progress!.style.width = "0%";
            // progress!.parentNode.style.display = "none";
        });

        function sleep(ms: number) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function log(i:string) { logOutput.value += `[${performance.now().toFixed(2)}] ` + i + '\n'; }
        
        class Whisper {
            min_length:Int32Array;
            max_length:Int32Array;
            num_return_sequences:Int32Array;
            length_penalty:Float32Array;
            repetition_penalty:Float32Array;
            attention_mask:Int32Array;
            sess:InferenceSession|null;

            async createSession(url:string){
                const opt : InferenceSession.SessionOptions = {
                    executionProviders: ["wasm"],
                    logSeverityLevel: 3,
                    logVerbosityLevel: 3,
                };
                modelLoading.value = true;
                const response = await fetch(url);
                modelFile = await response.arrayBuffer();
                modelLoading.value = false;
                modelInitializing.value = true;
                this.sess = await runModelUtils.createModelCpu(modelFile, opt);
                modelInitializing.value = false;
            }

            constructor(url:string, cb:Function) {
                this.sess = null;

                // semi constants that we initialize once and pass to every run() call
                this.min_length = Int32Array.from({ length: 1 }, () => 1);
                this.max_length = Int32Array.from({ length: 1 }, () => 448);
                this.num_return_sequences = Int32Array.from({ length: 1 }, () => 1);
                this.length_penalty = Float32Array.from({ length: 1 }, () => 1.);
                this.repetition_penalty = Float32Array.from({ length: 1 }, () => 1.);
                this.attention_mask = Int32Array.from({ length: 1 * 80 * 3000 }, () => 0);

                this.createSession(url);

                InferenceSession.create(url).then((s) => {
                    this.sess = s;
                    cb();
                }, (e) => { cb(e); })
            }

            async run(audio_pcm: Float32Array, beams = 1) {
                // clone semi constants into feed. The clone is needed if we run with ort.env.wasm.proxy=true
                const feed = {
                    "audio_pcm": new Tensor(audio_pcm,[1,audio_pcm.length]),
                    "max_length": new Tensor(new Int32Array(this.max_length), [1]),
                    "min_length": new Tensor(new Int32Array(this.min_length), [1]),
                    "num_beams": new Tensor(Int32Array.from({ length: 1 }, () => beams), [1]),
                    "num_return_sequences": new Tensor(new Int32Array(this.num_return_sequences), [1]),
                    "length_penalty": new Tensor(new Float32Array(this.length_penalty), [1]),
                    "repetition_penalty": new Tensor(new Float32Array(this.repetition_penalty), [1]),
                    "attention_mask": new Tensor(new Int32Array(this.attention_mask), [1, 80, 3000]),
                }

                return this.sess!.run(feed as any);
            }
        }

        // start recording
        async function startRecord() {
            if (mediaRecorder === undefined) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    mediaRecorder = new MediaRecorder(stream);
                } catch (e) {
                    log(`Access to Microphone, ${e}`);
                }
            }
            let recording_start = performance.now();
            let chunks: Blob[] = [];

            mediaRecorder!.ondataavailable = (e) => {
                chunks.push(e.data);
                // log(`recorded - on avalible data: ${((performance.now() - recording_start) / 1000).toFixed(1)}sec`);
            }

            mediaRecorder!.onstop = () => {
                const blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
                log(`recorded ${((performance.now() - recording_start) / 1000).toFixed(1)}sec audio`);
                console.log(blob);
                console.log(audio_src);
                audio_src!.src = window.URL.createObjectURL(blob);
            };
            mediaRecorder!.start(kIntervalAudio_ms);
            
            recordBtn.value = "Stop";
        }

        // stop recording
        function stopRecord() {
            if (mediaRecorder) {
                mediaRecorder.stop();
                mediaRecorder = undefined;
            }
        }

        // report progress
        function update_status(t: number) {
            total_processing_time += t;
            total_processing_count += 1;
            latency.value = 1000 * 30 * total_processing_count / total_processing_time;
            latencyOutput.value = `${latency.value.toFixed(1)} x realtime`;
        }

        // process audio buffer
        async function process_audio(audio: Float32Array, starttime: number, idx: number, pos: number) {
            if (idx < audio.length) {
                // not done
                try {
                    // update progress bar
                    // progress.style.width = (idx * 100 / audio.length).toFixed(1) + "%";
                    // progress.textContent = progress.style.width;
                    await sleep(kDelay);

                    // run inference for 30 sec
                    const xa = audio.slice(idx, idx + kSteps);
                    const start = performance.now();
                    const ret = await sess!.run(xa);
                    const diff = performance.now() - start;
                    
                    update_status(diff);

                    // append results to textarea 
                    outputText.value += `${ret.str.data[0]}\n`;
                    // textarea.scrollTop = textarea.scrollHeight;
                    await sleep(kDelay);
                    process_audio(audio, starttime, idx + kSteps, pos + 30);
                } catch (e) {
                    log(`Error: ${e}`);
                    // ready();
                    transcribeBtn.value = "Transcribe";
                    transcribing.value = false;
                }
            } else {
                // done with audio buffer
                const processing_time = ((performance.now() - starttime) / 1000);
                const total = (audio.length / kSampleRate);
                log(`${latency.value}, total ${processing_time.toFixed(1)}sec for ${total.toFixed(1)}sec`);
                // ready();
                transcribeBtn.value = "Transcribe";
                transcribing.value = false;
            }
        }

        // transcribe audio source
        async function handleTranscribeClick() {
            if (audio_src!.src == "") {
                log("Error: set some Audio input");
                return;
            }

            // busy();
            transcribeBtn.value = "Transcribing...";
            transcribing.value = true;
            log("start transcribe ...");

            outputText.value = "";
            latency.value = 0;

            try {
                const buffer = await (await fetch(audio_src!.src)).arrayBuffer();
                const audioBuffer = await context!.decodeAudioData(buffer);
                var offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
                var source = offlineContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(offlineContext.destination);
                source.start();
                const renderedBuffer = await offlineContext.startRendering();
                const audio = renderedBuffer.getChannelData(0);
                process_audio(audio, performance.now(), 0, 0);
            }
            catch (e) {
                log(`Error: ${e}`);
                // ready();
                transcribeBtn.value = "Transcribe";
                transcribing.value = false;
                // progress.style.width = "0%";
                // progress.parentNode.style.display = "none";

            }
        }

        // transcribe done
        // function ready() {
            // progress.style.width = "0%";
            // progress.parentNode.style.display = "none";
        // }

        log("loading model");
        try {
            sess = new Whisper(MODEL_FILEPATH, (e:string|undefined) => {
                if (e === undefined) {
                    log(`${MODEL_FILEPATH} loaded, ${env.wasm.numThreads} threads`);
                    transcribing.value = false;
                    modelLoading.value = false;
                } else {
                    log(`Error: ${e}`);
                }
            });
            if (!context) {
                throw new Error("no AudioContext, make sure domain has access to Microphone");
            }
        } catch (e) {
            log(`Error: ${e}`);
        }

        async function handleMicClick(){
            if(recording.value){
                stopRecord();
                recordBtn.value = "Record";
                recording.value = false;
            } else {
                await startRecord();
                recordBtn.value = "Stop";
                recording.value = true;
            }
        }

        return {
            modelLoading,
            modelInitializing,
            modelLoadingError,
            sessionRunning,
            imageLoading,
            imageLoadingError,
            outputText,
            logOutput,
            recordBtn,
            transcribeBtn,
            latency,
            transcribing,
            recording,
            latencyOutput,
            handleFileChange,
            log,
            stopRecord,
            startRecord,
            handleMicClick,
            handleTranscribeClick,
        }
    }
});

</script>
<style lang="postcss" scoped>
@import "../../variables.css";

.userInputInterface {
    display: flex;
    flex-wrap: wrap;
    column-gap: 10px;
    justify-content: space-between;
    margin: 10px;
}
/* Add rounded corners to blocks */
.audioInput {
    width: 10%;
    border-radius: 12px;
    border: 1px solid #4b3838;
    padding: 20px;
    position: relative;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
}
.transcribe {
    width: 20%;
    flex-wrap: wrap;
    flex-direction: column;
    border-radius: 12px;
    border: 1px solid #4b3838;
    padding: 20px;
    position: relative;
}
.transcription {
    border-radius: 12px;
    border: 1px solid #4b3838;
    padding: 20px;
    position: relative;
    column-gap: 10px;
    justify-content: space-between;
    margin: 10px;
    height: 300px;
    white-space: pre-line;
}
.log {
    border-radius: 12px;
    border: 1px solid #4b3838;
    padding: 20px;
    position: relative;
    column-gap: 10px;
    justify-content: space-between;
    margin: 10px;
}
.Btn {
    margin: auto;
    background: #f5f5f5;
    box-shadow: 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
    align-items: center;
    border-radius: 12px;
    display: inline-flex;
    height: 40px;
    font-size: 10px;
    transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1), color 1ms;
    padding: 0 16px;
  }
.stats {
    width: 20%;
    flex-wrap: wrap;
    flex-direction: column;
    border-radius: 12px;
    border: 1px solid #4b3838;
    padding: 20px;
    position: relative;
}
</style>