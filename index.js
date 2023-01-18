const express = require("express");
const sequelize = require("sequelize");
const { Op } = require("sequelize");
const app = express();
const { Joke } = require("./db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/jokes", async (req, res, next) => {
	try {
		// TODO - filter the jokes by tags and content
		const where = {};
		if (req.query.tags) {
			let tagsQuery = req.query.tags; // 'tag1,tag2;tag3' OR ['tag1,tag2', 'tag3']
			if (Array.isArray(tagsQuery)) {
				tagsQuery = tagsQuery.join(";"); // 'tag1,tag2;tag3'
			}
			where.tags = {
				// ['tag1,tag2' 'tag3']
				[Op.or]: tagsQuery
					.split(";")
					// [{[Op.and]: patterns}, {[Op.and]: patterns}]
					.map((tags) => {
						// 'tag1,tag2'
						return {
							[Op.and]: tags // make patterns
								.split(",")
								// ['tag1', 'tag2']
								.map((tag) => tag.trim().toLowerCase()) // sanitize each tag
								// [{[Op.like]: "%tag1%"}, {[Op.like]: "%tag2%"}]
								.map((tag) => {
									return { [Op.like]: `%${tag}%` };
								}), // replace tag with pattern
						};
					}), // result: [{[Op.and]: [{[Op.like]: "%tag1%"}, {[Op.like]: "%tag2%"}]}, {[Op.and]: [{[Op.like]: "%tag3%"}]}]
			};
		}
		if (req.query.content) {
			where.joke = sequelize.where(
				sequelize.fn("LOWER", sequelize.col("joke")),
				Op.like,
				`%${req.query.content}%`
			);
		}
		const jokes = await Joke.findAll({
			where: where,
			attributes: {
				exclude: ["updatedAt", "createdAt"],
			},
		});
		res.send(jokes);
	} catch (error) {
		console.error(error);
		next(error);
	}
});

app.post("/jokes", async (req, res) => {
	const values = {
		joke: req.body.joke,
		tags: req.body.tags.toLowerCase(),
	};

	const newJoke = await Joke.create(values);
	res.send(newJoke);
});

app.delete("/jokes/:id", async (req, res, next) => {
	const id = req.params.id;
	let destroyed = await Joke.destroy({
		where: { id },
	});
	if (destroyed < 1) {
		return next(`No joke with id ${id} exists`);
	}

	res.send("Removed joke");
});

app.put("/jokes/:id", async (req, res, next) => {
	const id = req.params.id;
	const joke = await Joke.findByPk(id);
	if (!joke) {
		return next(`No joke with id ${id} exists`);
	}
	const values = {};
	if (req.body.joke) {
		values.joke = req.body.joke;
	}
	if (req.body.tags) {
		values.tags = req.body.tags;
	}

	res.send(await joke.update(values));
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;
