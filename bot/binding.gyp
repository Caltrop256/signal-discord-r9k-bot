{
	"targets": [
		{
			"target_name": "binding",
			"sources": [
				"./util/r9Kodec.cpp"
			],
			"conditions": [
				[
					"OS==\"linux\"",
					{
						"cflags_cc": [
							"-std=c++17"
						]
					}
				]
			]
		}
	]
}