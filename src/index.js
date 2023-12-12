import { z } from "zod";
import ytdl from 'ytdl-core';
import Fastify from 'fastify';
import { unlink } from "node:fs";
import ffmpeg from 'fluent-ffmpeg';
import { AssemblyAI } from "assemblyai";
import { randomUUID } from 'node:crypto';

import createSummarization  from './queries/create-summarization.js';
import getSummarization  from './queries/get-summarization.js';
import { ValidateData } from "./class/validatedData.js";

const server = Fastify();

const AssemblyAIClient = new AssemblyAI({
	apiKey: process.env.ASSEMBLYAI_API_KEY
});

const audioSchema = z.object({
	title: z.string(),
	link: z.string().regex(new RegExp(/https:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/)),
	startAt: z.number(),
	endAt: z.number(),
});

//verificar válidação do body
const validateBody = (request, reply, done) => {
	try {
		if (request.method === 'POST' || request.method === 'PUT'){
			if (Object.keys(request.body).length !==  4)
				throw 'Body is invalid, check the body parameters.';
			
			const { title, link, startAt, endAt } = request.body;
			
			audioSchema.parse({title, link, startAt, endAt});
			
			done();
		} else{
			done();
		}
	} catch (error) {
		return reply.status(500).send({ success: false, message: error });
	}	
}

const validateId = (request, reply, done) => {
	if (request.method === 'PUT' || request.method === 'DELETE'){
		const { id } = request.params;

		console.log(id);

		const uuidv4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if(!uuidv4Pattern.test(id)){
			reply.code(400).send({ error: 'Invalid UUID v4 ID'});
			return;
		}
		done();
	}else{
		done();
	}
}

server.addHook('preHandler', validateBody);
server.addHook('preHandler', validateId);

server.post("/summarization", async (request, response) => {
	try{
		const { title, link, startAt, endAt } = request.body;
		
		const validateData = new ValidateData(title, link, startAt, endAt);
		
		const videoReableStream = ytdl(validateData.link, {
			quality: "lowestaudio"
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

		if (!validateData.isValidInfo())
			throw 'Information sent is invalid';

		await createSummarization(validateData);

		unlink(`${outputFolder}${filename}`, (err) => {
			if(err) return console.log(err);
			console.log(`${outputFolder}${filename} deleted successfully`);
		});

		return response.status(201).send({message: "Successfully created summarization"});
		
	} catch (error){
		return response.status(500).send({ success: false, message: error });
	}
});

server.get("/summarization", async (request, response) => {
	const summarization = await getSummarization();
	return response.status(200).send(summarization);
});

server.put("/summarization/:id", (request, response) => {
	const summarizationId = request.params.id;
	const { title, link, startAt, endAt } = request.body;

	database.update(summarizationId, {
		title: title,
		link: link,
		startAt: startAt,
		endAt: endAt,
	})

	return response.status(204).send();
});

server.delete("/summarization/:id", (request, response) => {
	const summarizationId = request.params.id;

	console.log('Delete: ' + summarizationId);
	//database.delete(summarizationId);

	return response.status(200).send({"message" : "successfully removed"});
});

server.listen({
	port: 3333
});
