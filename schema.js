const JoiBase = require('joi');
const sanitizeHtml = require('sanitize-html');

// Extend Joi to add stringEscapeHtml type
const Joi = JoiBase.extend((joi) => ({
  type: 'stringEscapeHtml',
  base: joi.string(),
  messages: {
    'stringEscapeHtml.invalid': '{{#label}} contains unsafe HTML content',
  },
  rules: {
    escape: {
      method() {
        return this.$_addRule({ name: 'escape' });
      },
      validate(value, helpers) {
        const clean = sanitizeHtml(value, {
          allowedTags: [],
          allowedAttributes: {},
        });
        return clean;
      },
    },
  },
}));

// Full Product Schema (Used After AI Analysis)
module.exports.productSchema = Joi.object({
  name: Joi.stringEscapeHtml().escape().required(),
  brand: Joi.stringEscapeHtml().escape().allow(''),
  category: Joi.stringEscapeHtml().escape().required(),
  material: Joi.stringEscapeHtml().escape().required(),
  weight: Joi.number().min(0).allow(null),
  originCountry: Joi.stringEscapeHtml().escape().allow(''),
  price: Joi.number().min(0).allow(null),
  notes: Joi.stringEscapeHtml().escape().allow(''),
  
  impactAnalysis: Joi.object({
    carbonFootprint: Joi.number().min(0).required(),
    waterUsage: Joi.number().min(0).required(),
    recyclability: Joi.string().valid('Low', 'Medium', 'High').required(),
    sustainabilityScore: Joi.number().min(1).max(10).required(),
    aiExplanation: Joi.stringEscapeHtml().escape().allow('')
  }).required()
}).required();

//  Product Input Schema (Before AI Processing)
module.exports.productInputSchema = Joi.object({
  name: Joi.stringEscapeHtml().escape().required(),
  brand: Joi.stringEscapeHtml().escape().allow(''),
  category: Joi.stringEscapeHtml().escape().required(),
  material: Joi.stringEscapeHtml().escape().required(),
  weight: Joi.number().min(0).allow(null),
  originCountry: Joi.stringEscapeHtml().escape().allow(''),
  price: Joi.number().min(0).allow(null),
  notes: Joi.stringEscapeHtml().escape().allow('')
}).required();