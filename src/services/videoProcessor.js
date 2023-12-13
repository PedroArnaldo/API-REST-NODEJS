import ytdl from "ytdl-core";
import { unlink } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import { AssemblyAI } from "assemblyai";
import { randomUUID } from "node:crypto";

import { ValidateData } from "../class/validatedData.js";

const AssemblyAIClient = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

const processVideo = async (data) => {
  try {
    const validateData = new ValidateData(
      data.title,
      data.link,
      data.startAt,
      data.endAt,
    );

    const videoReableStream = ytdl(validateData.link, {
      quality: "lowestaudio",
    });

    const filename = `${randomUUID()}.mp3`;
    const outputFolder = "public/audios/";

    const ffmpegCommand = ffmpeg(videoReableStream)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .seekInput(validateData.startAt)
      .duration(validateData.endAt - validateData.startAt)
      .format("mp3")
      .output(`${outputFolder}${filename}`);

    await new Promise((resolve, reject) => {
      ffmpegCommand.on("end", resolve);
      ffmpegCommand.on("error", reject);
      ffmpegCommand.run();
    });

    /* const params = {
            audio: `${outputFolder}${filename}`,
            summarization: true,
            summary_model: 'informative',
            summary_type: 'bullets'
        }
    
        const transcript = await AssemblyAIClient.transcripts.transcribe(params);
        */

    validateData.updateTranscript("transcript.transcript");
    validateData.updateSummary("transcript.summary");

    if (!validateData.isValidInfo()) throw "Error data";

    unlink(`${outputFolder}${filename}`, (err) => {
      if (err) return console.log(err);
      console.log(`${outputFolder}${filename} deleted successfully`);
    });

    return validateData;
  } catch (error) {
    throw error;
  }
};

export default processVideo;
