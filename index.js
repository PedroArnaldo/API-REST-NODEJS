import { z } from "zod";
import ytdl from 'ytdl-core';
import Fastify from 'fastify';
import postgres from "postgres";
import { unlink } from "node:fs";
import ffmpeg from 'fluent-ffmpeg';
import { AssemblyAI } from "assemblyai";
import { randomUUID } from 'node:crypto';

import { Database } from './database.js';

const server = Fastify();

const database = new Database();

const AssemblyAIClient = new AssemblyAI({
	apiKey: process.env.ASSEMBLYAI_API_KEY
});

/**
 * Receber os dados do meu front-end [X]
 * validar os dados recebidos do meu front-end [X]
 * Transformar o video do link em um áudio e salvar ele temporiariamente na pasta public/audios
 * Enviar o audio para a API do assemblyai e pegar o job id daquela tarefa
 * salvar as informações so resumo no banco de dados local
 * Excluir o audio depois de criar a transcrição
 * 
 * 
 * Criar o banco de dados Postregres
 * Conectar com banco de dados
 * Salvar os dados no banco de dados
 */

/**
 * Receber os dados do meu front-end
 * validar os dados recebidos do meu front-end
 * extrair o áudio do video e salvar localmente temporariamente na pasta public/audios
 * cortar o áudio para o tamanho definido
 * Enviar o áudio para API do assemblyai e pegar o job id daquela tarefa
 * Salvar o id do job no banco de dados
 * Verificar se o assemblyai já terminou o transcrever o áudio 
 * Pagar o áudio da pasta public
 */

//created schema check for audio
const audioSchema = z.object({
	title: z.string(),
	link: z.string().regex(new RegExp(/https:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/)),
	startAt: z.number(),
	endAt: z.number(),
});

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });


async function getPostgresVersion() {

  const response = await sql`select version()`;

  console.log(response);

}

getPostgresVersion();

server.post("/summarization", async (request, response) => {
	try{
		const { title, link, startAt, endAt } = request.body;

		const data = audioSchema.parse({title, link, startAt, endAt});
		
		const videoReableStream = ytdl(data.link, {
			quality: "lowestaudio"
		});

		const filename = `${randomUUID()}.mp3`;
		const outputFolder = "public/audios/";
		
		const ffmpegCommand = ffmpeg(videoReableStream)
			.noVideo()
			.audioCodec("libmp3lame")
			.audioBitrate(128)
			.seekInput(data.startAt)
			.duration(data.endAt - data.startAt)
			.format("mp3")
			.output(`${outputFolder}${filename}`);
		
		await new Promise((resolve, reject) => {
			ffmpegCommand.on("end", resolve);
			ffmpegCommand.on("error", reject);
			ffmpegCommand.run();
		});
	
		const params = {
			audio: `${outputFolder}${filename}`,
			summarization: true,
			summary_model: 'informative',
			summary_type: 'bullets'
		}

		const transcript = await AssemblyAIClient.transcripts.transcribe(params);

		console.log(transcript);

		database.create({
			title: title,
			link: link,
			startAt, startAt,
			endAt: endAt,
			transcript: transcript.text,
			summary: transcript.summary
		});

		unlink(`${outputFolder}${filename}`, (err) => {
			if(err) return console.log(err);
			console.log(`${outputFolder}${filename} deleted successfully`);
		});

		return response.status(201).send({message: "Successfully created summarization"});
		
	} catch (error){
		return response.status(500).send({ success: false, message: error });
	}
});

server.get("/summarization", (request, response) => {
	const search = request.query.search;
	const summarization = database.list(search);

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

	database.delete(summarizationId);

	return response.status(200).send({"message" : "successfully removed"});
});

server.listen({
	port: 3333
});

